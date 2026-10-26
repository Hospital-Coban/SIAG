import { app, shell, BrowserWindow, Notification } from 'electron'
import { join } from 'node:path'
import { initDb } from './database/connection.js'
import { registrarIpc } from './ipc/index.js'
import { NotificacionesService } from './modules/notificaciones/notificaciones.service.js'
import { ConfiguracionService } from './modules/configuracion/configuracion.service.js'
import { buscarActualizaciones } from './modules/actualizaciones/actualizaciones.service.js'
import { ETIQUETA_ESTADO } from '../shared/semaforo.js'

app.setName('Inventario Hospitalario')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hospital.inventario')
}

const INTERVALO_EVALUACION_MS = 60 * 60 * 1000

let ventana = null

function crearVentana() {
  ventana = new BrowserWindow({
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

  ventana.webContents.on('console-message', (_event, nivel, mensaje, linea, fuente) => {
    console.log(`[renderer:${nivel}] ${mensaje} (${fuente}:${linea})`)
  })

  ventana.webContents.on('did-fail-load', (_event, codigo, descripcion, url) => {
    console.error(`[renderer] fallo al cargar ${url}: ${codigo} ${descripcion}`)
  })

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

function enfocarVentana() {
  if (!ventana) return
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
}

function textoVencimiento(cambio) {
  if (cambio.dias_restantes == null) return ''
  if (cambio.dias_restantes < 0) return `venció hace ${Math.abs(cambio.dias_restantes)} día(s)`
  return `vence en ${cambio.dias_restantes} día(s)`
}

function enviarNotificaciones(cambios) {
  if (!cambios.length || !Notification.isSupported()) return

  let notificacion
  if (cambios.length === 1) {
    const c = cambios[0]
    notificacion = new Notification({
      title: `Lote ${c.numero_lote} → ${ETIQUETA_ESTADO[c.estado_nuevo]}`,
      body: [
        `${c.descripcion_completa} (${c.cantidad_unitaria})`,
        `Vencimiento ${c.fecha_vencimiento} — ${textoVencimiento(c)}.`,
        `Existencias: ${c.saldo_lote} unidad(es).`
      ].join('\n')
    })
  } else {
    const max = 5
    const detalle = cambios
      .slice(0, max)
      .map((c) => `• ${c.numero_lote} (${c.codigo_producto}): ${ETIQUETA_ESTADO[c.estado_anterior]} → ${ETIQUETA_ESTADO[c.estado_nuevo]}`)
      .join('\n')
    const resto = cambios.length > max ? `\n…y ${cambios.length - max} más.` : ''
    notificacion = new Notification({
      title: `${cambios.length} lotes cambiaron de estado`,
      body: `${detalle}${resto}`
    })
  }

  notificacion.on('click', enfocarVentana)
  notificacion.show()
}

// Solo se permite una instancia de la app: si ya está abierta y el usuario
// vuelve a ejecutarla, la nueva instancia se cierra y la ventana existente
// se restaura y enfoca.
const instanciaUnica = app.requestSingleInstanceLock()

if (!instanciaUnica) {
  app.quit()
} else {
  app.on('second-instance', () => {
    enfocarVentana()
  })

  app.whenReady().then(() => {
    const db = initDb()
    registrarIpc(db)

    const notificaciones = new NotificacionesService(db)
    const configuracion = new ConfiguracionService(db)

    const evaluarEstados = () => {
      try {
        // Siempre se actualizan los estados; solo se avisa si está habilitado.
        const cambios = notificaciones.detectarCambios()
        const cfg = configuracion.obtener('notificaciones_vencimiento')
        if (cfg.valor === '1') enviarNotificaciones(cambios)
      } catch (err) {
        console.error('[notificaciones] error al evaluar estados:', err)
      }
    }

    evaluarEstados()
    setInterval(evaluarEstados, INTERVALO_EVALUACION_MS)

    // Chequeo silencioso de actualizaciones al iniciar (solo si está empaquetada).
    if (app.isPackaged) {
      setTimeout(() => buscarActualizaciones(), 10_000)
    }

    crearVentana()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
