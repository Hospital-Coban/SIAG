import { requerido } from '../../utils/errores.js'

const TIPOS_ENTRADA = ['Entrada_Compra', 'Entrada_Donacion']

export class KardexService {
  constructor(db) {
    this.db = db
  }

  listar(filtros = {}) {
    let sql = `
      SELECT
        t.id_transaccion,
        t.id_lote,
        t.numero_kardex,
        t.fecha_movimiento,
        t.tipo_movimiento,
        t.cantidad,
        t.documento_referencia,
        t.destino,
        t.id_documento,
        t.observaciones,
        d.numero AS numero_documento,
        d.observaciones AS observaciones_documento,
        l.precio_unitario,
        s.cantidad_unitaria,
        s.codigo_producto,
        s.descripcion_completa,
        l.numero_lote,
        l.fecha_vencimiento,
        e.nombre_razon_social,
        e.tipo_entidad
      FROM transacciones_kardex t
      JOIN inventario_lotes l ON l.id_lote = t.id_lote
      JOIN cat_suministros s ON s.id_suministro = l.id_suministro
      LEFT JOIN cat_entidades e ON e.id_entidad = t.id_entidad
      LEFT JOIN inventario_documentos d ON d.id_documento = t.id_documento
    `
    const where = []
    const params = []
    if (filtros.id_suministro) {
      where.push('s.id_suministro = ?')
      params.push(filtros.id_suministro)
    }
    if (filtros.tipo_movimiento) {
      where.push('t.tipo_movimiento = ?')
      params.push(filtros.tipo_movimiento)
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY t.fecha_movimiento DESC, t.id_transaccion DESC LIMIT 1000'

    return this.db.prepare(sql).all(...params)
  }

  _generarNumeroKardex() {
    const { n } = this.db
      .prepare('SELECT COUNT(*) AS n FROM transacciones_kardex')
      .get()
    return `K-${String(n + 1).padStart(4, '0')}`
  }

  // Una salida es ahora UNA sola fila (por el lote elegido), así que en la práctica
  // "un número por movimiento". No se agrega UNIQUE en la BD porque una base ya
  // usada con salidas PEPS antiguas podría contener números repetidos y fallaría
  // la migración; la unicidad se valida aquí y en el cliente.
  _assertKardexLibre(numero) {
    if (!numero) return
    const existe = this.db
      .prepare('SELECT 1 FROM transacciones_kardex WHERE numero_kardex = ? LIMIT 1')
      .get(numero)
    if (existe) {
      throw new Error(`El número de kardex ${numero} ya está registrado.`)
    }
  }

  // El destino viene como FK del catálogo; el nombre se desnormaliza en la
  // transacción para que los reportes que leen `destino` sigan funcionando.
  _resolverDestino(id_destino) {
    const destino = this.db
      .prepare('SELECT id_destino, nombre_destino FROM cat_destinos WHERE id_destino = ?')
      .get(Number(id_destino))
    if (!destino) throw new Error('El destino seleccionado no existe en el catálogo.')
    return destino
  }

  // Entrada (Compra o Donación): crea un lote y su transacción positiva.
  registrarEntrada(datos = {}) {
    const id_suministro = requerido(datos.id_suministro, 'Suministro')
    const numero_lote = requerido(datos.numero_lote, 'Número de lote')
    const fecha_vencimiento = requerido(datos.fecha_vencimiento, 'Fecha de vencimiento')
    const precio_unitario = Number(datos.precio_unitario)
    const id_entidad = requerido(datos.id_entidad, 'Entidad')
    const cantidad = Number(datos.cantidad)
    const tipo = requerido(datos.tipo_movimiento, 'Tipo de movimiento')

    if (!Number.isFinite(precio_unitario) || precio_unitario < 0) {
      throw new Error('Precio unitario no válido.')
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de entrada debe ser un entero positivo.')
    }
    if (!TIPOS_ENTRADA.includes(tipo)) {
      throw new Error(`Tipo de movimiento no válido para una entrada: ${tipo}.`)
    }

    const numero_kardex = datos.numero_kardex || this._generarNumeroKardex()
    if (datos.numero_kardex) this._assertKardexLibre(String(datos.numero_kardex).trim())

    const tx = this.db.transaction(() => {
      const infoLote = this.db
        .prepare(
          `INSERT INTO inventario_lotes
             (id_suministro, numero_lote, fecha_vencimiento, precio_unitario)
           VALUES (?, ?, ?, ?)`
        )
        .run(Number(id_suministro), numero_lote, fecha_vencimiento, precio_unitario)

      const infoKardex = this.db
        .prepare(
          `INSERT INTO transacciones_kardex
             (numero_kardex, id_entidad, id_lote, tipo_movimiento, cantidad, documento_referencia)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          numero_kardex,
          Number(id_entidad),
          infoLote.lastInsertRowid,
          tipo,
          cantidad,
          datos.documento_referencia || null
        )

      return infoKardex.lastInsertRowid
    })

    const id_transaccion = tx()
    return this._porId(id_transaccion)
  }

  // Salida por lote: se descuenta del lote que el usuario elige, no
  // automáticamente. El lote es obligatorio para que el descargo pueda
  // identificar de qué lote salió cada unidad.
  registrarSalida(datos = {}) {
    const id_suministro = Number(requerido(datos.id_suministro, 'Suministro'))
    const id_lote = Number(requerido(datos.id_lote, 'Lote'))
    const id_entidad = Number(requerido(datos.id_entidad, 'Entidad'))
    const cantidad = Number(datos.cantidad)

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de salida debe ser un entero positivo.')
    }

    const lote = this._loteConSaldo(id_lote, id_suministro)
    if (!lote) {
      throw new Error('El lote no existe o no tiene existencias disponibles.')
    }
    if (lote.saldo < cantidad) {
      throw new Error(
        `Stock insuficiente en el lote ${lote.numero_lote}: hay ${lote.saldo} unidad(es) y se solicitan ${cantidad}.`
      )
    }

    const numero_kardex = datos.numero_kardex || this._generarNumeroKardex()
    if (datos.numero_kardex) this._assertKardexLibre(String(datos.numero_kardex).trim())

    const destino = datos.id_destino ? this._resolverDestino(datos.id_destino) : null

    const info = this.db
      .prepare(
        `INSERT INTO transacciones_kardex
           (numero_kardex, id_entidad, id_lote, tipo_movimiento, cantidad, documento_referencia, id_destino, destino)
         VALUES (?, ?, ?, 'Salida', ?, ?, ?, ?)`
      )
      .run(
        numero_kardex,
        id_entidad,
        lote.id_lote,
        -cantidad,
        datos.documento_referencia || null,
        destino?.id_destino ?? null,
        destino?.nombre_destino ?? null
      )

    return this._porId(info.lastInsertRowid)
  }

  _loteConSaldo(id_lote, id_suministro) {
    return this.db
      .prepare(
        `SELECT
           l.id_lote,
           l.numero_lote,
           l.fecha_vencimiento,
           l.precio_unitario,
           COALESCE(SUM(t.cantidad), 0) AS saldo
         FROM inventario_lotes l
         LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
         WHERE l.id_lote = ? AND l.id_suministro = ?
         GROUP BY l.id_lote
         HAVING saldo > 0`
      )
      .get(id_lote, id_suministro)
  }

  // Reajuste: ajuste puntual sobre un lote concreto (positivo o negativo).
  registrarReajuste(datos = {}) {
    const id_lote = Number(requerido(datos.id_lote, 'Lote'))
    const id_entidad = Number(requerido(datos.id_entidad, 'Entidad'))
    const cantidad = Number(datos.cantidad)

    if (!Number.isInteger(cantidad) || cantidad === 0) {
      throw new Error('El reajuste debe ser un entero distinto de cero.')
    }

    const numero_kardex = datos.numero_kardex || this._generarNumeroKardex()
    if (datos.numero_kardex) this._assertKardexLibre(String(datos.numero_kardex).trim())

    const info = this.db
      .prepare(
        `INSERT INTO transacciones_kardex
           (numero_kardex, id_entidad, id_lote, tipo_movimiento, cantidad, documento_referencia)
         VALUES (?, ?, ?, 'Reajuste', ?, ?)`
      )
      .run(numero_kardex, id_entidad, id_lote, cantidad, datos.documento_referencia || null)

    return this._porId(info.lastInsertRowid)
  }

  _porId(id_transaccion) {
    return this.db
      .prepare(
        `SELECT t.*, s.codigo_producto, s.descripcion_completa, l.numero_lote, l.fecha_vencimiento
         FROM transacciones_kardex t
         JOIN inventario_lotes l ON l.id_lote = t.id_lote
         JOIN cat_suministros s ON s.id_suministro = l.id_suministro
         WHERE t.id_transaccion = ?`
      )
      .get(id_transaccion)
  }
}
