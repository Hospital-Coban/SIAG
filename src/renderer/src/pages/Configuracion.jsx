import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'

export default function Configuracion({ temaActual, setTemaGlobal }) {
  const [preferencia, setPreferencia] = useState(() => {
    return localStorage.getItem('preferenciaTema') || 'light'
  })
  const [enviando, setEnviando] = useState(false)
  const [ruta, setRuta] = useState(null)
  const [toast, mostrarToast, cerrarToast] = useToast()
  const [notifActivas, setNotifActivas] = useState(true)
  const [cargandoNotif, setCargandoNotif] = useState(true)
  const [probandoNotif, setProbandoNotif] = useState(false)
  const [actualizacion, setActualizacion] = useState(null)
  const [buscandoActualizacion, setBuscandoActualizacion] = useState(false)

  useEffect(() => {
    let vivo = true
    window.api.config.obtener('notificaciones_vencimiento').then((res) => {
      if (!vivo) return
      if (res.ok) setNotifActivas(res.data?.valor === '1')
      setCargandoNotif(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  const cambiarNotificaciones = async (activas) => {
    setNotifActivas(activas)
    const res = await window.api.config.guardar(
      'notificaciones_vencimiento',
      activas ? '1' : '0'
    )
    if (!res.ok) {
      setNotifActivas(!activas)
      mostrarToast(res.error, 'error')
      return
    }
    mostrarToast(activas ? 'Notificaciones de semáforo activadas' : 'Notificaciones de semáforo desactivadas')
  }

  const probarNotificacion = async () => {
    setProbandoNotif(true)
    try {
      const res = await window.api.notificaciones.probar()
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Notificación de prueba enviada')
    } finally {
      setProbandoNotif(false)
    }
  }

  useEffect(() => {
    let vivo = true
    window.api.actualizaciones.estado().then((res) => {
      if (vivo && res.ok) setActualizacion(res.data)
    })
    const desuscribir = window.api.actualizaciones.onEstado((estado) => {
      if (vivo) setActualizacion(estado)
    })
    return () => {
      vivo = false
      desuscribir()
    }
  }, [])

  const buscarActualizacion = async () => {
    setBuscandoActualizacion(true)
    try {
      const res = await window.api.actualizaciones.buscar()
      if (!res.ok) mostrarToast(res.error, 'error')
    } finally {
      setBuscandoActualizacion(false)
    }
  }

  const instalarActualizacion = async () => {
    const res = await window.api.actualizaciones.instalar()
    if (!res.ok) mostrarToast(res.error, 'error')
  }

  useEffect(() => {
    localStorage.setItem('preferenciaTema', preferencia)
    if (preferencia === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTemaGlobal(isDark ? 'dark' : 'light')
    } else {
      setTemaGlobal(preferencia)
    }
  }, [preferencia, setTemaGlobal])

  // Escuchar cambios en el sistema si la preferencia es "system"
  useEffect(() => {
    if (preferencia !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const manejador = (e) => setTemaGlobal(e.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', manejador)
    return () => mediaQuery.removeEventListener('change', manejador)
  }, [preferencia, setTemaGlobal])

  const guardarRespaldo = async () => {
    setEnviando(true)
    setRuta(null)
    try {
      const res = await window.api.backup.guardar()
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      if (res.data.cancelado) {
        mostrarToast('Respaldo cancelado', 'error')
        return
      }
      setRuta(res.data.ruta)
      mostrarToast('Respaldo creado correctamente')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración y Ajustes</h1>

      {/* ── Apariencia ── */}
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Apariencia</h2>
        
        <div className="form-control max-w-sm">
          <label className="label cursor-pointer justify-start gap-4">
            <input 
              type="radio" 
              name="theme-radios" 
              className="radio radio-primary" 
              checked={preferencia === 'light'} 
              onChange={() => setPreferencia('light')} 
            />
            <span className="label-text text-base">Modo Claro (Light)</span>
          </label>
        </div>
        
        <div className="form-control max-w-sm">
          <label className="label cursor-pointer justify-start gap-4">
            <input 
              type="radio" 
              name="theme-radios" 
              className="radio radio-primary" 
              checked={preferencia === 'dark'} 
              onChange={() => setPreferencia('dark')} 
            />
            <span className="label-text text-base">Modo Oscuro (Dark)</span>
          </label>
        </div>
        
        <div className="form-control max-w-sm">
          <label className="label cursor-pointer justify-start gap-4">
            <input 
              type="radio" 
              name="theme-radios" 
              className="radio radio-primary" 
              checked={preferencia === 'system'} 
              onChange={() => setPreferencia('system')} 
            />
            <span className="label-text text-base">Automático (Igual al sistema)</span>
          </label>
        </div>
      </div>

      {/* ── Notificaciones ── */}
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="campana" className="h-7 w-7 shrink-0 text-primary" />
          <h2 className="text-lg font-semibold">Notificaciones del semáforo</h2>
        </div>
        <p className="opacity-70 text-sm mb-4">
          Avisa cuando un lote que aún tiene existencias cambia de estado en el
          semáforo de vencimiento (verde → amarillo → rojo). Se revisa al abrir
          la aplicación y después cada hora.
        </p>
        <div className="space-y-2 mb-4 text-sm opacity-80">
          <div>
            <span className="badge badge-success badge-sm mr-2">VERDE</span>
            Vence en más de 365 días
          </div>
          <div>
            <span className="badge badge-warning badge-sm mr-2">AMARILLO</span>
            Vence entre 180 y 365 días
          </div>
          <div>
            <span className="badge badge-error badge-sm mr-2">ROJO</span>
            Vence en menos de 180 días (incluye vencidos)
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="label cursor-pointer gap-3">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={notifActivas}
              disabled={cargandoNotif}
              onChange={(e) => cambiarNotificaciones(e.target.checked)}
            />
            <span className="label-text">Avisarme cuando un lote cambie de estado</span>
          </label>
          <button
            className="btn btn-outline btn-neutral btn-sm"
            onClick={probarNotificacion}
            disabled={probandoNotif}
          >
            {probandoNotif && <span className="loading loading-spinner loading-sm" />}
            Probar notificación
          </button>
        </div>
      </div>

      {/* ── Actualizaciones ── */}
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="descargar" className="h-7 w-7 shrink-0 text-primary" />
          <h2 className="text-lg font-semibold">Actualizaciones</h2>
        </div>
        <p className="opacity-70 text-sm mb-4">
          Busca y descarga las últimas versiones del sistema publicadas en GitHub.
        </p>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="opacity-70">Versión instalada:</span>{' '}
            <span className="font-mono font-semibold">
              {actualizacion?.version_actual || '…'}
            </span>
            {actualizacion?.version_nueva && (
              <span className="ml-3">
                <span className="opacity-70">Nueva versión:</span>{' '}
                <span className="font-mono font-semibold text-success">
                  {actualizacion.version_nueva}
                </span>
              </span>
            )}
          </div>

          {actualizacion?.estado === 'descargando' && actualizacion.progreso && (
            <div>
              <progress
                className="progress progress-primary w-full"
                value={actualizacion.progreso.percent || 0}
                max="100"
              />
              <div className="text-xs opacity-60 mt-1">
                Descargando… {Math.round(actualizacion.progreso.percent || 0)}%
              </div>
            </div>
          )}

          {actualizacion?.estado === 'error' && (
            <div className="alert alert-error py-2 text-sm">
              <span>{actualizacion.error || 'Error al buscar actualizaciones.'}</span>
            </div>
          )}

          {actualizacion?.estado === 'no_empaquetada' && (
            <div className="alert alert-info py-2 text-sm">
              <span>
                Las actualizaciones solo están disponibles en la versión instalada
                (empaquetada), no en modo desarrollo.
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
               className="btn btn-outline btn-primary btn-sm"
              onClick={buscarActualizacion}
              disabled={buscandoActualizacion || actualizacion?.estado === 'buscando' || actualizacion?.estado === 'descargando'}
            >
              {(buscandoActualizacion || actualizacion?.estado === 'buscando') && (
                <span className="loading loading-spinner loading-sm" />
              )}
              Buscar actualizaciones
            </button>
            {actualizacion?.estado === 'listo' && (
               <button className="btn btn-outline btn-success btn-sm" onClick={instalarActualizacion}>
                Reiniciar para aplicar
              </button>
            )}
          </div>

          {actualizacion?.estado === 'inactivo' && actualizacion.version_actual && !actualizacion.version_nueva && (
            <div className="text-sm opacity-60">Estás en la última versión.</div>
          )}
          {actualizacion?.estado === 'listo' && (
            <div className="text-sm text-success">
              La actualización se instalará al reiniciar la aplicación.
            </div>
          )}
        </div>
      </div>

      {/* ── Respaldo ── */}
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="respaldo" className="h-7 w-7 shrink-0 text-primary" />
          <h2 className="text-lg font-semibold">Respaldo de la base de datos</h2>
        </div>
        <p className="opacity-70 text-sm mb-4">
          Copia el archivo <span className="font-mono">database.sqlite</span> a una memoria USB u
          otra ubicación física para respaldar la contabilidad del inventario. El respaldo es
          consistente y se genera sin cerrar la aplicación.
        </p>
        <button className="btn btn-outline btn-primary" onClick={guardarRespaldo} disabled={enviando}>
          {enviando && <span className="loading loading-spinner loading-sm" />}
          Guardar respaldo…
        </button>
        {ruta && (
          <div className="alert alert-success mt-3">
            <span>
              Respaldo guardado en: <span className="font-mono break-all">{ruta}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Información ── */}
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Información de la Aplicación</h2>
        <table className="table table-sm max-w-md">
          <tbody>
            <tr>
              <td className="opacity-70">Nombre</td>
              <td className="font-semibold">Inventario Hospitalario</td>
            </tr>
            <tr>
              <td className="opacity-70">Versión</td>
              <td className="font-mono">{actualizacion?.version_actual || 'v0.1.0'}</td>
            </tr>
            <tr>
              <td className="opacity-70">Desarrollador</td>
              <td>Ministerio de Salud Pública y Asistencia Social (MSPAS) / Hospital</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
