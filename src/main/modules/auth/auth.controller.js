import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { AuthService } from './auth.service.js'

export function registrarAuthIpc(db) {
  const service = new AuthService(db)

  ipcMain.handle(CANALES.AUTH_LOGIN, async (_event, usuario, password) => {
    try {
      return { ok: true, data: service.login(usuario, password) }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(CANALES.AUTH_SESION, async (_event, token) => {
    try {
      return { ok: true, data: service.sesion(token) }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle(CANALES.AUTH_LOGOUT, async (_event, token) => {
    try {
      return { ok: true, data: service.logout(token) }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}
