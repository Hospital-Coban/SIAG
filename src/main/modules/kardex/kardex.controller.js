import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { KardexService } from './kardex.service.js'

export function registrarKardexIpc(db) {
  const service = new KardexService(db)

  ipcMain.handle(CANALES.KARDEX_LISTAR, async (_event, filtros) => {
    try {
      return { ok: true, data: service.listar(filtros || {}) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar kardex') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_ENTRADA, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarEntrada(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar entrada') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_SALIDA, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarSalida(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar salida') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_REAJUSTE, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarReajuste(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar reajuste') }
    }
  })
}
