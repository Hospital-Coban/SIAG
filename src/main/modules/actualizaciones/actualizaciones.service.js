import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

// Estado compartido con la UI (Configuración).
let estado = {
  version_actual: app.getVersion(),
  estado: 'inactivo', // inactivo | buscando | disponible | descargando | listo | error | no_empaquetada
  version_nueva: null,
  progreso: null, // { percent, transferred, total, bytesPerSecond }
  error: null
}

function emitir() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('actualizaciones:estado', estado)
  }
}

function mover(nuevo) {
  estado = { ...estado, ...nuevo }
  emitir()
}

export function estadoActualizacion() {
  return estado
}

function configurar() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    mover({ estado: 'buscando', error: null, progreso: null })
  })

  autoUpdater.on('update-available', (info) => {
    mover({ estado: 'disponible', version_nueva: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    mover({
      estado: 'inactivo',
      version_nueva: null,
      progreso: null,
      error: null
    })
  })

  autoUpdater.on('download-progress', (progreso) => {
    mover({ estado: 'descargando', progreso })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mover({ estado: 'listo', version_nueva: info.version, progreso: null })
  })

  autoUpdater.on('error', (err) => {
    mover({ estado: 'error', progreso: null, error: String(err?.message || err) })
  })
}

let configurado = false

export function buscarActualizaciones() {
  if (!app.isPackaged) {
    mover({ estado: 'no_empaquetada', error: null })
    return estado
  }
  if (!configurado) {
    configurar()
    configurado = true
  }
  // checkForUpdates resuelve; los eventos actualizan el estado.
  autoUpdater.checkForUpdates().catch((err) => {
    mover({ estado: 'error', error: String(err?.message || err) })
  })
  return estado
}

export function instalarActualizacion() {
  // Cierra la app; autoInstallOnAppQuit se encarga de instalar.
  app.quit()
}
