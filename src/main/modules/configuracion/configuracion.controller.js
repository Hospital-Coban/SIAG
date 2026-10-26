import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { ConfiguracionService } from './configuracion.service.js'

export function registrarConfiguracionIpc(db) {
  const service = new ConfiguracionService(db)

  ipcMain.handle(CANALES.CONFIG_OBTENER, async (_event, clave) => {
    try {
      return { ok: true, data: service.obtener(clave) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Obtener configuración') }
    }
  })

  ipcMain.handle(CANALES.CONFIG_GUARDAR, async (_event, clave, valor) => {
    try {
      return { ok: true, data: service.guardar(clave, valor) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Guardar configuración') }
    }
  })
}
