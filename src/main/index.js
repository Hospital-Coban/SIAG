import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { initDb } from './database/connection.js'
import { registrarIpc } from './ipc/index.js'

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  ventana.on('ready-to-show', () => ventana.show())

  ventana.webContents.setWindowOpenHandler((detalles) => {
    shell.openExternal(detalles.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    ventana.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    ventana.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const db = initDb()
  registrarIpc(db)

  crearVentana()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
