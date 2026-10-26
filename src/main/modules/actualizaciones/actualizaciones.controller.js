import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import {
  buscarActualizaciones,
  instalarActualizacion,
  estadoActualizacion
} from './actualizaciones.service.js'

export function registrarActualizacionesIpc() {
  ipcMain.handle(CANALES.ACTUALIZACIONES_ESTADO, async () => {
    try {
      return { ok: true, data: estadoActualizacion() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Estado de actualizaciones') }
    }
  })

  ipcMain.handle(CANALES.ACTUALIZACIONES_BUSCAR, async () => {
    try {
      return { ok: true, data: buscarActualizaciones() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Buscar actualizaciones') }
    }
  })

  ipcMain.handle(CANALES.ACTUALIZACIONES_INSTALAR, async () => {
    try {
      return { ok: true, data: instalarActualizacion() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Instalar actualización') }
    }
  })
}
