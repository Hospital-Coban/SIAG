export class InventarioService {
  constructor(db) {
    this.db = db
  }

  saldo() {
    return this.db
      .prepare(
        `SELECT
           s.id_suministro,
           s.codigo_producto,
           s.descripcion_completa,
           s.cantidad_unitaria,
           COALESCE(SUM(t.cantidad), 0) AS saldo_total,
           COUNT(DISTINCT CASE WHEN t.cantidad <> 0 THEN l.id_lote END) AS total_lotes
         FROM cat_suministros s
         LEFT JOIN inventario_lotes l ON l.id_suministro = s.id_suministro
         LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
         GROUP BY s.id_suministro
         ORDER BY s.codigo_producto ASC`
      )
      .all()
  }

  listarLotes(id_suministro) {
    const base = `
      SELECT
        l.id_lote,
        l.id_suministro,
        l.numero_lote,
        l.fecha_vencimiento,
        l.precio_unitario,
        COALESCE(SUM(t.cantidad), 0) AS saldo_lote,
        CAST(julianday(l.fecha_vencimiento) - julianday('now') AS INTEGER) AS dias_restantes
      FROM inventario_lotes l
      LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
    `
    if (id_suministro) {
      return this.db
        .prepare(`${base} WHERE l.id_suministro = ? GROUP BY l.id_lote ORDER BY l.fecha_vencimiento ASC`)
        .all(id_suministro)
    }
    return this.db
      .prepare(`${base} GROUP BY l.id_lote ORDER BY l.fecha_vencimiento ASC`)
      .all()
  }

  reporteInventario(filtros = {}) {
    let sql = `
      SELECT
        l.id_lote,
        s.id_suministro,
        s.codigo_producto,
        s.descripcion_completa,
        s.cantidad_unitaria,
        l.numero_lote,
        l.fecha_vencimiento,
        l.precio_unitario,
        COALESCE(SUM(t.cantidad), 0) AS saldo_lote,
        COALESCE(NULLIF(s.numero_tarjeta, ''), MAX(t.numero_kardex)) AS numero_kardex
      FROM inventario_lotes l
      JOIN cat_suministros s ON s.id_suministro = l.id_suministro
      LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
    `
    const where = []
    const params = []

    if (filtros.fechaDesde) {
      where.push(`EXISTS (
        SELECT 1 FROM transacciones_kardex tk
        WHERE tk.id_lote = l.id_lote
        AND DATE(tk.fecha_movimiento) >= ?
      )`)
      params.push(filtros.fechaDesde)
    }
    if (filtros.fechaHasta) {
      where.push(`EXISTS (
        SELECT 1 FROM transacciones_kardex tk
        WHERE tk.id_lote = l.id_lote
        AND DATE(tk.fecha_movimiento) <= ?
      )`)
      params.push(filtros.fechaHasta)
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ')

    sql += `
      GROUP BY l.id_lote
      HAVING saldo_lote > 0
      ORDER BY s.descripcion_completa ASC, l.fecha_vencimiento ASC
    `

    return this.db.prepare(sql).all(...params)
  }

  proximosVencer(dias = 90) {
    return this.db
      .prepare(
        `SELECT
           l.id_lote,
           s.codigo_producto,
           s.descripcion_completa,
           l.numero_lote,
           l.fecha_vencimiento,
           COALESCE(SUM(t.cantidad), 0) AS saldo_lote,
           CAST(julianday(l.fecha_vencimiento) - julianday('now') AS INTEGER) AS dias_restantes
         FROM inventario_lotes l
         JOIN cat_suministros s ON s.id_suministro = l.id_suministro
         LEFT JOIN transacciones_kardex t ON t.id_lote = l.id_lote
         GROUP BY l.id_lote
         HAVING saldo_lote > 0
            AND dias_restantes >= 0
            AND dias_restantes <= ?
         ORDER BY l.fecha_vencimiento ASC`
      )
      .all(dias)
  }
}
