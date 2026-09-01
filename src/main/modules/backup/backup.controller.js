import { ipcMain, dialog, BrowserWindow } from 'electron'
import { CANALES } from '../../../shared/ipc.js'

function nombreArchivo() {
  const ahora = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `respaldo_inventario_${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}.sqlite`
}

export function registrarBackupIpc(db) {
  ipcMain.handle(CANALES.BACKUP_GUARDAR, async (event) => {
    try {
      const ventana = BrowserWindow.fromWebContents(event.sender)
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Guardar respaldo de la base de datos',
        defaultPath: nombreArchivo(),
        buttonLabel: 'Guardar respaldo',
        filters: [
          { name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] }
        ]
      })

      if (canceled || !filePath) {
        return { ok: true, data: { cancelado: true } }
      }

      // db.backup() de better-sqlite3 es seguro en caliente (online backup API).
      await db.backup(filePath)

      return { ok: true, data: { cancelado: false, ruta: filePath } }
    } catch (err) {
      return { ok: false, error: `No se pudo crear el respaldo: ${err.message}` }
    }
  })
}
