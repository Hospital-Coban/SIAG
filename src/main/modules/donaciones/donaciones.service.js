export class DonacionesService {
  constructor(db) {
    this.db = db
  }

  listar() {
    return this.db
      .prepare(
        `SELECT
           e.*,
           t.id_transaccion,
           t.numero_kardex,
           t.fecha_movimiento,
           t.cantidad,
           l.precio_unitario,
           s.codigo_producto,
           s.descripcion_completa,
           ent.nombre_razon_social
         FROM expedientes_donacion e
         JOIN transacciones_kardex t ON t.id_transaccion = e.id_transaccion
         JOIN inventario_lotes l ON l.id_lote = t.id_lote
         JOIN cat_suministros s ON s.id_suministro = l.id_suministro
         LEFT JOIN cat_entidades ent ON ent.id_entidad = t.id_entidad
         ORDER BY t.fecha_movimiento DESC`
      )
      .all()
  }
}
