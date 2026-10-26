// Columnas F..Y de la plantilla DESCARGO: 19 municipios de Alta Verapaz + OTROS.
export const MUNICIPIOS = [
  'CAHABON',
  'CAMPUR',
  'CARCHA',
  'CHAHAL',
  'CHAMELCO',
  'CHISEC',
  'COBAN',
  'FRAY',
  'LA TINTA',
  'LANQUIN',
  'PANZOS',
  'RAXRUHA',
  'SAN CRISTOBAL',
  'SANTA CRUZ',
  'SENAHU',
  'TACTIC',
  'TAMAHU',
  'TELEMAN',
  'TUCURU'
]

export const COL_OTROS = 'OTROS'

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

// Una fila por suministro:
//  - saldoInicial: movimientos acumulados hasta el fin del mes anterior
//  - ingresos:     compras del mes
//  - salidasPorDestino: |cantidad| de las salidas del mes, por destino
export function datosDescargo(db, { mes, anio }) {
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`
  const hasta = mes === 12
    ? `${anio + 1}-01-01`
    : `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  const corteAnterior = menosUnDia(desde)

  const movimientos = db
    .prepare(
      `SELECT
         l.id_suministro,
         t.cantidad,
         COALESCE(dest.columna_descargo, t.destino) AS destino,
         CASE WHEN DATE(t.fecha_movimiento) <= ? THEN 'inicial' ELSE 'mes' END AS bucket
       FROM transacciones_kardex t
       JOIN inventario_lotes l ON l.id_lote = t.id_lote
       LEFT JOIN cat_destinos dest ON dest.id_destino = t.id_destino
       WHERE DATE(t.fecha_movimiento) < ?`
    )
    .all(corteAnterior, hasta)

  const mapa = new Map()

  for (const mv of movimientos) {
    if (!mapa.has(mv.id_suministro)) {
      mapa.set(mv.id_suministro, { saldoInicial: 0, ingresos: 0, salidas: new Map() })
    }
    const fila = mapa.get(mv.id_suministro)

    if (mv.bucket === 'inicial') {
      fila.saldoInicial += mv.cantidad
      continue
    }

    if (mv.cantidad > 0) {
      fila.ingresos += mv.cantidad
    } else if (mv.cantidad < 0) {
      const destino = String(mv.destino || '').trim() || COL_OTROS
      fila.salidas.set(destino, (fila.salidas.get(destino) || 0) + Math.abs(mv.cantidad))
    }
  }

  const suministros = db
    .prepare(
      `SELECT id_suministro, codigo_producto, descripcion_completa, cantidad_unitaria
       FROM cat_suministros
       ORDER BY descripcion_completa ASC, cantidad_unitaria ASC`
    )
    .all()

  // Descargo = una fila por suministro, así que se promedian sus lotes. El peso
  // es el saldo de cada lote: un lote agotado pesa 0 y no distorsiona el valor.
  const precios = db
    .prepare(
      `SELECT
         l.id_suministro,
         SUM(l.precio_unitario * COALESCE(s.saldo, 0)) / NULLIF(SUM(COALESCE(s.saldo, 0)), 0) AS precio_unitario,
         AVG(l.precio_unitario) AS precio_promedio
       FROM inventario_lotes l
       LEFT JOIN (
         SELECT id_lote, SUM(cantidad) AS saldo
          FROM transacciones_kardex
          WHERE DATE(fecha_movimiento) < ?
         GROUP BY id_lote
       ) s ON s.id_lote = l.id_lote
       GROUP BY l.id_suministro
       HAVING SUM(COALESCE(s.saldo, 0)) > 0`
    )
    .all(hasta)
  const precioPorSuministro = new Map(
    precios.map((p) => [p.id_suministro, p.precio_unitario || 0])
  )
  // Suministros sin saldo vivo caen al promedio simple de sus lotes.
  const precioPromedio = new Map(
    db.prepare(`SELECT id_suministro, AVG(precio_unitario) AS p FROM inventario_lotes l
      WHERE EXISTS (SELECT 1 FROM transacciones_kardex t WHERE t.id_lote=l.id_lote AND DATE(t.fecha_movimiento) < ?)
      GROUP BY id_suministro`)
      .all(hasta)
      .map((r) => [r.id_suministro, r.p || 0])
  )

  const kardinero = db.prepare(
    `SELECT COALESCE(NULLIF(s.numero_tarjeta, ''), t.numero_kardex) AS numero_kardex
     FROM transacciones_kardex t
     JOIN inventario_lotes l ON l.id_lote = t.id_lote
     JOIN cat_suministros s ON s.id_suministro = l.id_suministro
     WHERE l.id_suministro = ? AND DATE(t.fecha_movimiento) < ?
     ORDER BY t.id_transaccion DESC
     LIMIT 1`
  )

  // Lotes salidos en el mes: como la salida obliga a elegir lote, las columnas
  // de lote/vencimiento del reporte se llenan con los lotes realmente usados.
  const lotesSalidos = db
    .prepare(
      `SELECT l.id_suministro, l.numero_lote, l.fecha_vencimiento
       FROM transacciones_kardex t
       JOIN inventario_lotes l ON l.id_lote = t.id_lote
       WHERE DATE(t.fecha_movimiento) >= ? AND DATE(t.fecha_movimiento) < ? AND t.cantidad < 0
       GROUP BY l.id_lote
       ORDER BY l.fecha_vencimiento ASC, l.id_lote ASC`
    )
    .all(desde, hasta)
  const lotesPorSuministro = new Map()
  for (const l of lotesSalidos) {
    if (!lotesPorSuministro.has(l.id_suministro)) lotesPorSuministro.set(l.id_suministro, [])
    lotesPorSuministro.get(l.id_suministro).push(l)
  }

  return suministros.map((s) => {
    const datos = mapa.get(s.id_suministro) || {
      saldoInicial: 0,
      ingresos: 0,
      salidas: new Map()
    }

    let totalSalidas = 0
    for (const cantidad of datos.salidas.values()) totalSalidas += cantidad

    const ultimo = kardinero.get(s.id_suministro, hasta)
    const lotes = lotesPorSuministro.get(s.id_suministro) || []

    return {
      id_suministro: s.id_suministro,
      descripcion_completa: `${s.descripcion_completa} — ${s.cantidad_unitaria}`,
      codigo_producto: s.codigo_producto,
      saldo_inicial: datos.saldoInicial,
      ingresos: datos.ingresos,
      salidas_por_destino: datos.salidas,
      total_salidas: totalSalidas,
      saldo_fisico: datos.saldoInicial + datos.ingresos - totalSalidas,
      precio_unitario: precioPorSuministro.get(s.id_suministro) ?? precioPromedio.get(s.id_suministro) ?? 0,
      ultimo_kardex: ultimo?.numero_kardex || '',
      lotes: lotes.map((l) => l.numero_lote),
      vencimientos: lotes.map((l) => l.fecha_vencimiento)
    }
  })
}

// "Cobán", "coban " y "COBAN" deben caer en la misma columna.
export function claveMunicipio(nombre) {
  return String(nombre || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function indiceMunicipio() {
  return new Map(MUNICIPIOS.map((m) => [claveMunicipio(m), m]))
}

export function nombreArchivoDescargo({ mes, anio }) {
  const nombreMes = MESES[Number(mes) - 1] || ''
  return `Descargo ${nombreMes} ${anio}.xlsx`
}

export function tituloHoja({ mes, anio }) {
  const nombreMes = MESES[Number(mes) - 1] || ''
  return `DESCARGO ${nombreMes.toUpperCase()} ${anio} `
}

function menosUnDia(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
