import { CAMPOS_DONACION, limpiarNombreOng, claveNombreOng } from '../../../shared/donaciones.js'

export class DonacionesService {
  constructor(db) {
    this.db = db
  }

  listar() {
    return this.db.prepare(`SELECT p.*, o.nombre AS nombre_ong
      FROM programa_donaciones p JOIN ong_donantes o ON o.id_ong = p.id_ong
      ORDER BY p.fecha_entrega DESC, p.id_expediente DESC`).all().map((f) => ({
      ...JSON.parse(f.datos), ...f, datos: undefined
    })).filter((f) => !f.eliminado)
  }

  obtener(id) {
    return this.listar().find((f) => f.id_expediente === Number(id))
  }

  listarOng() {
    return this.db.prepare('SELECT id_ong, nombre FROM ong_donantes ORDER BY nombre COLLATE NOCASE').all()
  }

  guardarOng(nombre) {
    const limpio = limpiarNombreOng(nombre)
    const clave = claveNombreOng(limpio)
    this.db.prepare('INSERT OR IGNORE INTO ong_donantes(nombre, nombre_normalizado) VALUES (?, ?)').run(limpio, clave)
    return this.db.prepare('SELECT id_ong FROM ong_donantes WHERE nombre_normalizado = ?').get(clave).id_ong
  }

  validar(datos) {
    const limpio = {}
    for (const [k] of CAMPOS_DONACION) {
      if (k !== 'monto_total') limpio[k] = String(datos[k] ?? '').trim()
    }
    limpio.nombre_ong = limpiarNombreOng(limpio.nombre_ong)
    if (!limpio.nombre_ong) throw new Error('Ingrese o seleccione el nombre de la ONG donante.')
    if (!limpio.descripcion_completa) throw new Error('La descripción de la donación es obligatoria.')
    limpio.cantidad = Number(limpio.cantidad)
    limpio.precio_unitario = Number(limpio.precio_unitario)
    if (!Number.isInteger(limpio.cantidad) || limpio.cantidad <= 0) throw new Error('La cantidad debe ser un entero positivo.')
    if (datos.precio_unitario === '' || !Number.isFinite(limpio.precio_unitario) || limpio.precio_unitario < 0) throw new Error('El valor unitario no es válido.')
    for (const [k, etiqueta, tipo] of CAMPOS_DONACION) {
      if (tipo === 'date' && limpio[k] && (!/^\d{4}-\d{2}-\d{2}$/.test(limpio[k]) || Number.isNaN(Date.parse(limpio[k])) || new Date(limpio[k]).toISOString().slice(0, 10) !== limpio[k])) {
        throw new Error(`${etiqueta}: fecha no válida.`)
      }
    }
    return limpio
  }

  crear(datos) {
    const limpio = this.validar(datos)
    const id = this.db.transaction(() => {
      const id_ong = this.guardarOng(limpio.nombre_ong)
      return this.db.prepare(`INSERT INTO programa_donaciones
        (id_ong, fecha_entrega, datos) VALUES (?, ?, ?)`).run(
        id_ong, limpio.fecha_entrega || null, JSON.stringify(limpio)).lastInsertRowid
    })()
    return this.obtener(id)
  }

  actualizar(id, datos) {
    if (!this.obtener(id)) throw new Error('La donación no existe.')
    const limpio = this.validar(datos)
    this.db.transaction(() => {
      const id_ong = this.guardarOng(limpio.nombre_ong)
      this.db.prepare(`UPDATE programa_donaciones SET id_ong = ?, fecha_entrega = ?, datos = ?
        WHERE id_expediente = ?`).run(id_ong, limpio.fecha_entrega || null, JSON.stringify(limpio), id)
    })()
    return this.obtener(id)
  }

  eliminar(id) {
    if (!this.obtener(id)) throw new Error('La donación no existe.')
    this.db.prepare('DELETE FROM programa_donaciones WHERE id_expediente = ?').run(id)
    return { eliminado: true }
  }
}
