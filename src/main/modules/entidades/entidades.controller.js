import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { EntidadesService } from './entidades.service.js'

export function registrarEntidadesIpc(db) {
  const service = new EntidadesService(db)

  ipcMain.handle(CANALES.ENTIDADES_LISTAR, async () => {
    try {
      return { ok: true, data: service.listar() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar entidades') }
    }
  })

  ipcMain.handle(CANALES.ENTIDADES_CREAR, async (_event, datos) => {
    try {
      return { ok: true, data: service.crear(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Crear entidad') }
    }
  })

  ipcMain.handle(CANALES.ENTIDADES_ACTUALIZAR, async (_event, id, datos) => {
    try {
      return { ok: true, data: service.actualizar(id, datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Actualizar entidad') }
    }
  })

  ipcMain.handle(CANALES.ENTIDADES_ELIMINAR, async (_event, id) => {
    try {
      return { ok: true, data: service.eliminar(id) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Eliminar entidad') }
    }
  })
}
