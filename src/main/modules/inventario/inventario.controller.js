import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { InventarioService } from './inventario.service.js'

export function registrarInventarioIpc(db) {
  const service = new InventarioService(db)

  ipcMain.handle(CANALES.INVENTARIO_SALDO, async () => {
    try {
      return { ok: true, data: service.saldo() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Consultar saldo') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_LOTES_LISTAR, async (_event, id_suministro) => {
    try {
      return { ok: true, data: service.listarLotes(id_suministro) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar lotes') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_PROXIMOS_VENCER, async (_event, dias) => {
    try {
      return { ok: true, data: service.proximosVencer(dias ?? 90) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Consultar vencimientos') }
    }
  })
}
