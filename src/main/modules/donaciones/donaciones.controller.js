import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { DonacionesService } from './donaciones.service.js'

export function registrarDonacionesIpc(db) {
  const service = new DonacionesService(db)

  ipcMain.handle(CANALES.DONACIONES_LISTAR, async () => {
    try {
      return { ok: true, data: service.listar() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar expedientes de donación') }
    }
  })
}
