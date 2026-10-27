import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
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

  ipcMain.handle(CANALES.BACKUP_RESTAURAR, async (event) => {
    try {
      const ventana = BrowserWindow.fromWebContents(event.sender)
      const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
        title: 'Restaurar respaldo de la base de datos',
        buttonLabel: 'Restaurar respaldo',
        properties: ['openFile'],
        filters: [{ name: 'Base de datos SQLite', extensions: ['sqlite', 'db'] }]
      })
      if (canceled || !filePaths?.[0]) return { ok: true, data: { cancelado: true } }

      const origen = filePaths[0]
      const candidata = new Database(origen, { readonly: true, fileMustExist: true })
      const tablas = candidata.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name)
      candidata.prepare('PRAGMA integrity_check').get()
      candidata.close()
      const requeridas = ['cat_suministros', 'cat_entidades', 'inventario_lotes', 'transacciones_kardex']
      const faltantes = requeridas.filter((tabla) => !tablas.includes(tabla))
      if (faltantes.length) return { ok: false, error: `El respaldo no es compatible. Faltan tablas: ${faltantes.join(', ')}` }

      const destino = path.join(app.getPath('userData'), 'database.sqlite')
      const seguridad = path.join(app.getPath('userData'), `database_antes_restaurar_${Date.now()}.sqlite`)
      await db.backup(seguridad)
      db.close()
      fs.copyFileSync(origen, destino)
      app.relaunch()
      setTimeout(() => app.exit(0), 100)
      return { ok: true, data: { cancelado: false, ruta: origen, reinicio: true } }
    } catch (err) {
      return { ok: false, error: `No se pudo restaurar el respaldo: ${err.message}` }
    }
  })
}
