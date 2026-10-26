import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { DestinosService } from './destinos.service.js'

export function registrarDestinosIpc(db) {
  const service = new DestinosService(db)

  ipcMain.handle(CANALES.DESTINOS_LISTAR, async () => {
    try {
      return { ok: true, data: service.listar() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar destinos') }
    }
  })

  ipcMain.handle(CANALES.DESTINOS_CREAR, async (_event, datos) => {
    try {
      return { ok: true, data: service.crear(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Crear destino') }
    }
  })

  ipcMain.handle(CANALES.DESTINOS_ACTUALIZAR, async (_event, id, datos) => {
    try {
      return { ok: true, data: service.actualizar(id, datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Actualizar destino') }
    }
  })

  ipcMain.handle(CANALES.DESTINOS_ELIMINAR, async (_event, id) => {
    try {
      return { ok: true, data: service.eliminar(id) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Eliminar destino') }
    }
  })
}