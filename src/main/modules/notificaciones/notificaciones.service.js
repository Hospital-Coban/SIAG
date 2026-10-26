import { estadoVencimiento, diasParaVencer } from '../../../shared/semaforo.js'

// Detecta cambios de estado del semáforo (verde/amarillo/rojo) en los lotes
// que aún tienen existencias. Solo lotes con saldo > 0, igual que el reporte.
// La primera vez que observa un lote lo registra sin avisar (inicialización).
export class NotificacionesService {
  constructor(db) {
    this.db = db
  }

  detectarCambios() {
    const lotes = this.db
      .prepare(
        `SELECT
           l.id_lote,
           l.numero_lote,
           l.fecha_vencimiento,
           l.ultimo_estado,
           s.codigo_producto,
           s.descripcion_completa,
           s.cantidad_unitaria,
           COALESCE(SUM(t.cantidad), 0) AS saldo_lote
         FROM inventario_lotes l
         JOIN cat_suministros s ON s.id_suministro = l.id_suministro
         LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
         GROUP BY l.id_lote
         HAVING saldo_lote > 0`
      )
      .all()

    const actualizar = this.db.prepare(
      'UPDATE inventario_lotes SET ultimo_estado = ? WHERE id_lote = ?'
    )
    const cambios = []

    for (const lote of lotes) {
      const estado = estadoVencimiento(lote.fecha_vencimiento)
      if (lote.ultimo_estado === estado) continue

      if (lote.ultimo_estado != null) {
        cambios.push({
          id_lote: lote.id_lote,
          numero_lote: lote.numero_lote,
          codigo_producto: lote.codigo_producto,
          descripcion_completa: lote.descripcion_completa,
          cantidad_unitaria: lote.cantidad_unitaria,
          fecha_vencimiento: lote.fecha_vencimiento,
          saldo_lote: lote.saldo_lote,
          estado_anterior: lote.ultimo_estado,
          estado_nuevo: estado,
          dias_restantes: diasParaVencer(lote.fecha_vencimiento)
        })
      }
      actualizar.run(estado, lote.id_lote)
    }

    return cambios
  }
}
