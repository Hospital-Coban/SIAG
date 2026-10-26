import { requerido } from '../../utils/errores.js'

export class DestinosService {
  constructor(db) {
    this.db = db
  }

  listar() {
    return this.db
      .prepare(
        `SELECT
           d.*,
           (SELECT COUNT(*) FROM transacciones_kardex t WHERE t.id_destino = d.id_destino) AS movimientos
         FROM cat_destinos d
         ORDER BY d.nombre_destino ASC`
      )
      .all()
  }

  crear(datos = {}) {
    const nombre = this._normalizar(datos.nombre_destino)

    this.db.prepare('INSERT INTO cat_destinos (nombre_destino) VALUES (?)').run(nombre)

    return this._porId(this.db.prepare('SELECT last_insert_rowid() AS id').get().id)
  }

  actualizar(id, datos = {}) {
    const nombre = this._normalizar(datos.nombre_destino)
    const info = this.db
      .prepare('UPDATE cat_destinos SET nombre_destino = ? WHERE id_destino = ?')
      .run(nombre, id)
    if (info.changes === 0) throw new Error('El destino no existe.')
    return this._porId(id)
  }

  eliminar(id) {
    const enUso = this.db
      .prepare('SELECT COUNT(*) AS n FROM transacciones_kardex WHERE id_destino = ?')
      .get(id)
    if (enUso.n > 0) {
      throw new Error(
        `No se puede eliminar: el destino tiene ${enUso.n} movimiento(s) de kardex asociado(s).`
      )
    }

    const info = this.db.prepare('DELETE FROM cat_destinos WHERE id_destino = ?').run(id)
    if (info.changes === 0) throw new Error('El destino no existe.')
    return { eliminado: true }
  }

  _normalizar(valor) {
    return requerido(valor, 'Nombre del destino').trim()
  }

  _porId(id) {
    return this.db.prepare('SELECT * FROM cat_destinos WHERE id_destino = ?').get(id)
  }
}