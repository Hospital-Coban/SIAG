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
        t.numero_kardex,
        t.fecha_movimiento,
        t.tipo_movimiento,
        t.cantidad,
        t.documento_referencia,
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

  // Saldo disponible por lote de un suministro, ordenado PEPS (más próximo a vencer).
  _lotesDisponibles(id_suministro) {
    return this.db
      .prepare(
        `SELECT
           l.id_lote,
           l.numero_lote,
           l.fecha_vencimiento,
           COALESCE(SUM(t.cantidad), 0) AS saldo
         FROM inventario_lotes l
         LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
         WHERE l.id_suministro = ?
         GROUP BY l.id_lote
         HAVING saldo > 0
         ORDER BY l.fecha_vencimiento ASC, l.id_lote ASC`
      )
      .all(id_suministro)
  }

  _generarNumeroKardex() {
    const { n } = this.db
      .prepare('SELECT COUNT(*) AS n FROM transacciones_kardex')
      .get()
    return `K-${String(n + 1).padStart(4, '0')}`
  }

  // Entrada (Compra o Donación): crea un lote y su transacción positiva.
  // Si es Donación, además registra el expediente UCNI (1:1 con la transacción).
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

    let exp = null
    if (tipo === 'Entrada_Donacion') {
      exp = datos.expediente || {}
      // Puedes hacer requerido alguno si es estrictamente necesario, ej:
      // requerido(exp.no_expediente, 'Número de expediente')
    }

    const numero_kardex = datos.numero_kardex || this._generarNumeroKardex()

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

      if (tipo === 'Entrada_Donacion') {
        this.db
          .prepare(
            `INSERT INTO expedientes_donacion (
               id_transaccion, ano_donacion, no_expediente, tipo_donacion,
               no_caso_ucni, numero_siges, nombre_licenciado_ucni, no_carta_intencion, fecha_carta_intencion,
               dictamen_tecnico, fecha_dictamen_tecnico, no_carta_agradecimiento, fecha_carta_agradecimiento,
               no_acta_administrativa, fecha_suscripcion_acta, no_ingreso_almacen, anexo_utilizado,
               no_oficio_entrega, no_acuerdo_ministerial, fecha_aprobacion_acuerdo, codigo_siges,
               codigo_sicoin, cur, no_expediente_ucni, codigos_presupuestarios
             ) VALUES (
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             )`
          )
          .run(
            infoKardex.lastInsertRowid,
            exp.ano_donacion || null,
            exp.no_expediente || null,
            exp.tipo_donacion || null,
            exp.no_caso_ucni || null,
            exp.numero_siges || null,
            exp.nombre_licenciado_ucni || null,
            exp.no_carta_intencion || null,
            exp.fecha_carta_intencion || null,
            exp.dictamen_tecnico || null,
            exp.fecha_dictamen_tecnico || null,
            exp.no_carta_agradecimiento || null,
            exp.fecha_carta_agradecimiento || null,
            exp.no_acta_administrativa || null,
            exp.fecha_suscripcion_acta || null,
            exp.no_ingreso_almacen || null,
            exp.anexo_utilizado || null,
            exp.no_oficio_entrega || null,
            exp.no_acuerdo_ministerial || null,
            exp.fecha_aprobacion_acuerdo || null,
            exp.codigo_siges || null,
            exp.codigo_sicoin || null,
            exp.cur || null,
            exp.no_expediente_ucni || null,
            exp.codigos_presupuestarios || null
          )
      }

      return infoKardex.lastInsertRowid
    })

    const id_transaccion = tx()
    return this._porId(id_transaccion)
  }

  // Salida PEPS: descuenta del lote más próximo a vencer.
  // Genera una transacción negativa por cada lote afectado (mismo número de kardex).
  registrarSalida(datos = {}) {
    const id_suministro = Number(requerido(datos.id_suministro, 'Suministro'))
    const id_entidad = Number(requerido(datos.id_entidad, 'Entidad'))
    const cantidad = Number(datos.cantidad)

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de salida debe ser un entero positivo.')
    }

    const lotes = this._lotesDisponibles(id_suministro)
    const total = lotes.reduce((acc, l) => acc + l.saldo, 0)
    if (total < cantidad) {
      throw new Error(
        `Stock insuficiente: hay ${total} unidad(es) disponible(s) y se solicitan ${cantidad}.`
      )
    }

    const numero_kardex = datos.numero_kardex || this._generarNumeroKardex()

    const insert = this.db.prepare(
      `INSERT INTO transacciones_kardex
         (numero_kardex, id_entidad, id_lote, tipo_movimiento, cantidad, documento_referencia)
       VALUES (?, ?, ?, 'Salida', ?, ?)`
    )

    const tx = this.db.transaction(() => {
      let restante = cantidad
      for (const lote of lotes) {
        if (restante <= 0) break
        const aDescontar = Math.min(lote.saldo, restante)
        insert.run(numero_kardex, id_entidad, lote.id_lote, -aDescontar, datos.documento_referencia || null)
        restante -= aDescontar
      }
      return numero_kardex
    })

    const numero = tx()
    return { numero_kardex: numero, lotes_afectados: lotes.filter((_, i) => i < lotes.length).length }
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
