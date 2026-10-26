import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

let estado = {
  version_actual: app.getVersion(),
  estado: 'inactivo',
  version_nueva: null,
  progreso: null,
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

function mensajeActualizacion(err) {
  const texto = String(err?.message || err || '')
  if (/404|401|releases\.atom|authentication token/i.test(texto)) {
    return 'No se pudo acceder al servidor de actualizaciones. Verifica que el repositorio y sus releases estén disponibles.'
  }
  if (/ENOTFOUND|ECONNREFUSED|network|socket|timeout/i.test(texto)) {
    return 'No se pudo conectar al servidor de actualizaciones. Revisa tu conexión a internet.'
  }
  return 'No se pudo buscar actualizaciones en este momento. Intenta nuevamente más tarde.'
}

export function estadoActualizacion() {
  return estado
}

function configurar() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  const token = 'PEGA_AQUI_EL_TOKEN_DE_GITHUB'
  if (token && !token.startsWith('PEGA_AQUI_')) {
    autoUpdater.requestHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  } else {
    autoUpdater.requestHeaders = {}
  }

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
    console.error('[actualizaciones] error técnico:', err)
    mover({ estado: 'error', progreso: null, error: mensajeActualizacion(err) })
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
    console.error('[actualizaciones] error técnico:', err)
    mover({ estado: 'error', error: mensajeActualizacion(err) })
  })
  return estado
}

export function instalarActualizacion() {
  // Instala al cerrar y vuelve a iniciar la aplicación automáticamente.
  autoUpdater.quitAndInstall(false, true)
}
