import { requerido } from '../../utils/errores.js'

const TIPOS_VALIDOS = ['Proveedor', 'ONG', 'Distrito_Salud']

export class EntidadesService {
  constructor(db) {
    this.db = db
  }

  listar() {
    return this.db
      .prepare('SELECT * FROM cat_entidades ORDER BY nombre_razon_social ASC')
      .all()
  }

  crear(datos = {}) {
    const nombre = requerido(datos.nombre_razon_social, 'Nombre / razón social')
    const tipo = requerido(datos.tipo_entidad, 'Tipo de entidad')
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new Error(`Tipo de entidad no válido. Use: ${TIPOS_VALIDOS.join(', ')}.`)
    }

    const info = this.db
      .prepare(
        `INSERT INTO cat_entidades (nit_entidad, nombre_razon_social, tipo_entidad)
         VALUES (?, ?, ?)`
      )
      .run(datos.nit_entidad || null, nombre, tipo)

    return this.db
      .prepare('SELECT * FROM cat_entidades WHERE id_entidad = ?')
      .get(info.lastInsertRowid)
  }

  actualizar(id, datos = {}) {
    const nombre = requerido(datos.nombre_razon_social, 'Nombre / razón social')
    const tipo = requerido(datos.tipo_entidad, 'Tipo de entidad')
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new Error(`Tipo de entidad no válido. Use: ${TIPOS_VALIDOS.join(', ')}.`)
    }

    this.db
      .prepare(
        `UPDATE cat_entidades
         SET nit_entidad = ?, nombre_razon_social = ?, tipo_entidad = ?
         WHERE id_entidad = ?`
      )
      .run(datos.nit_entidad || null, nombre, tipo, id)

    return this.db
      .prepare('SELECT * FROM cat_entidades WHERE id_entidad = ?')
      .get(id)
  }

  eliminar(id) {
    const info = this.db
      .prepare('DELETE FROM cat_entidades WHERE id_entidad = ?')
      .run(id)
    if (info.changes === 0) throw new Error('La entidad no existe.')
    return { eliminado: true }
  }
}
