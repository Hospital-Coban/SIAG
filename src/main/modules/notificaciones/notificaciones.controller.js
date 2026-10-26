import { ipcMain, Notification } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'

export function registrarNotificacionesIpc() {
  ipcMain.handle(CANALES.NOTIFICACIONES_PROBAR, async () => {
    try {
      if (!Notification.isSupported()) {
        throw new Error('El sistema operativo no muestra notificaciones.')
      }
      const notificacion = new Notification({
        title: 'Notificaciones activas',
        body: 'Los avisos del semáforo de lotes se mostrarán así cuando un lote cambie de estado.'
      })
      notificacion.show()
      return { ok: true, data: true }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Probar notificación') }
    }
  })
}
