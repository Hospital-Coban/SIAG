import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { SuministrosService } from './suministros.service.js'

export function registrarSuministrosIpc(db) {
  const service = new SuministrosService(db)

  ipcMain.handle(CANALES.SUMINISTROS_LISTAR, async () => {
    try {
      return { ok: true, data: service.listar() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar suministros') }
    }
  })

  ipcMain.handle(CANALES.SUMINISTROS_CREAR, async (_event, datos) => {
    try {
      return { ok: true, data: service.crear(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Crear suministro') }
    }
  })

  ipcMain.handle(CANALES.SUMINISTROS_ACTUALIZAR, async (_event, id, datos) => {
    try {
      return { ok: true, data: service.actualizar(id, datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Actualizar suministro') }
    }
  })

  ipcMain.handle(CANALES.SUMINISTROS_ELIMINAR, async (_event, id) => {
    try {
      return { ok: true, data: service.eliminar(id) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Eliminar suministro') }
    }
  })
}
