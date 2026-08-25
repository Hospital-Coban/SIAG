import { requerido } from '../../utils/errores.js'

export class SuministrosService {
  constructor(db) {
    this.db = db
  }

  listar() {
    return this.db
      .prepare('SELECT * FROM cat_suministros ORDER BY codigo_producto ASC')
      .all()
  }

  crear(datos = {}) {
    const codigo = requerido(datos.codigo_producto, 'Código de producto')
    const descripcion = requerido(datos.descripcion_completa, 'Descripción')
    const unidad = requerido(datos.cantidad_unitaria, 'Cantidad unitaria')

    const info = this.db
      .prepare(
        `INSERT INTO cat_suministros (codigo_producto, descripcion_completa, cantidad_unitaria)
         VALUES (?, ?, ?)`
      )
      .run(codigo, descripcion, unidad)

    return this.db
      .prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?')
      .get(info.lastInsertRowid)
  }

  actualizar(id, datos = {}) {
    const codigo = requerido(datos.codigo_producto, 'Código de producto')
    const descripcion = requerido(datos.descripcion_completa, 'Descripción')
    const unidad = requerido(datos.cantidad_unitaria, 'Cantidad unitaria')

    this.db
      .prepare(
        `UPDATE cat_suministros
         SET codigo_producto = ?, descripcion_completa = ?, cantidad_unitaria = ?
         WHERE id_suministro = ?`
      )
      .run(codigo, descripcion, unidad, id)

    return this.db
      .prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?')
      .get(id)
  }

  eliminar(id) {
    const info = this.db
      .prepare('DELETE FROM cat_suministros WHERE id_suministro = ?')
      .run(id)
    if (info.changes === 0) throw new Error('El suministro no existe.')
    return { eliminado: true }
  }
}
