import { requerido } from '../../utils/errores.js'

export class DonacionesService {
  constructor(db) {
    this.db = db
  }

  _consultaDetalle() {
    return `SELECT
      e.*,
      t.id_transaccion,
      t.numero_kardex,
      t.fecha_movimiento,
      t.cantidad,
      t.documento_referencia,
      l.id_lote,
      l.numero_lote,
      l.fecha_vencimiento,
      l.precio_unitario,
      l.id_suministro,
      s.codigo_producto,
      s.descripcion_completa,
      ent.id_entidad,
      ent.nombre_razon_social
    FROM expedientes_donacion e
    JOIN transacciones_kardex t ON t.id_transaccion = e.id_transaccion
    JOIN inventario_lotes l ON l.id_lote = t.id_lote
    JOIN cat_suministros s ON s.id_suministro = l.id_suministro
    LEFT JOIN cat_entidades ent ON ent.id_entidad = t.id_entidad`
  }

  listar() {
    return this.db
      .prepare(
        `${this._consultaDetalle()}
         ORDER BY t.fecha_movimiento DESC`
      )
      .all()
  }

  obtener(id_expediente) {
    return this.db
      .prepare(`${this._consultaDetalle()} WHERE e.id_expediente = ?`)
      .get(id_expediente)
  }

  actualizar(id_expediente, datos = {}) {
    const expediente = this.db
      .prepare('SELECT * FROM expedientes_donacion WHERE id_expediente = ?')
      .get(id_expediente)
    if (!expediente) throw new Error('El expediente de donación no existe.')

    const txKardex = this.db
      .prepare('SELECT * FROM transacciones_kardex WHERE id_transaccion = ?')
      .get(expediente.id_transaccion)
    if (!txKardex) throw new Error('La transacción de kardex asociada no existe.')

    const id_suministro = requerido(datos.id_suministro, 'Suministro')
    const numero_lote = requerido(datos.numero_lote, 'Número de lote')
    const fecha_vencimiento = requerido(datos.fecha_vencimiento, 'Fecha de vencimiento')
    const precio_unitario = Number(datos.precio_unitario)
    const id_entidad = requerido(datos.id_entidad, 'Entidad')
    const cantidad = Number(datos.cantidad)

    if (!Number.isFinite(precio_unitario) || precio_unitario < 0) {
      throw new Error('Precio unitario no válido.')
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de la donación debe ser un entero positivo.')
    }

    const exp = datos.expediente || {}

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE inventario_lotes
           SET id_suministro = ?, numero_lote = ?, fecha_vencimiento = ?, precio_unitario = ?
           WHERE id_lote = ?`
        )
        .run(Number(id_suministro), numero_lote, fecha_vencimiento, precio_unitario, txKardex.id_lote)

      this.db
        .prepare(
          `UPDATE transacciones_kardex
           SET id_entidad = ?, cantidad = ?, documento_referencia = ?
           WHERE id_transaccion = ?`
        )
        .run(Number(id_entidad), cantidad, datos.documento_referencia || null, expediente.id_transaccion)

      this.db
        .prepare(
          `UPDATE expedientes_donacion SET
             ano_donacion = ?, no_expediente = ?, tipo_donacion = ?,
             no_caso_ucni = ?, numero_siges = ?, nombre_licenciado_ucni = ?,
             no_carta_intencion = ?, fecha_carta_intencion = ?,
             dictamen_tecnico = ?, fecha_dictamen_tecnico = ?,
             no_carta_agradecimiento = ?, fecha_carta_agradecimiento = ?,
             no_acta_administrativa = ?, fecha_suscripcion_acta = ?,
             no_ingreso_almacen = ?, anexo_utilizado = ?, no_oficio_entrega = ?,
             no_acuerdo_ministerial = ?, fecha_aprobacion_acuerdo = ?, codigo_siges = ?,
             codigo_sicoin = ?, cur = ?
           WHERE id_expediente = ?`
        )
        .run(
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
          id_expediente
        )
    })

    tx()
    return this.obtener(id_expediente)
  }

  eliminar(id_expediente) {
    const expediente = this.db
      .prepare('SELECT * FROM expedientes_donacion WHERE id_expediente = ?')
      .get(id_expediente)
    if (!expediente) throw new Error('El expediente de donación no existe.')

    const txKardex = this.db
      .prepare('SELECT * FROM transacciones_kardex WHERE id_transaccion = ?')
      .get(expediente.id_transaccion)
    if (!txKardex) throw new Error('La transacción de kardex asociada no existe.')

    const otras = this.db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM transacciones_kardex
         WHERE id_lote = ? AND id_transaccion <> ?`
      )
      .get(txKardex.id_lote, txKardex.id_transaccion)

    if (otras.n > 0) {
      throw new Error(
        'No se puede eliminar: el lote de esta donación ya tiene salidas o movimientos asociados.'
      )
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare('DELETE FROM expedientes_donacion WHERE id_expediente = ?')
        .run(id_expediente)
      this.db
        .prepare('DELETE FROM transacciones_kardex WHERE id_transaccion = ?')
        .run(expediente.id_transaccion)
      this.db.prepare('DELETE FROM inventario_lotes WHERE id_lote = ?').run(txKardex.id_lote)
    })

    tx()
    return { eliminado: true }
  }
}