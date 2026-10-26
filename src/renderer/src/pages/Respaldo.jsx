import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'

export default function Respaldo() {
  const [enviando, setEnviando] = useState(false)
  const [ruta, setRuta] = useState(null)
  const [toast, mostrarToast, cerrarToast] = useToast()

  const guardar = async () => {
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
      <h1 className="text-2xl font-bold">Respaldo de datos</h1>

      <div className="card w-full max-w-2xl bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <Icon name="respaldo" className="h-8 w-8 shrink-0 text-primary" />
            <h2 className="card-title">Respaldo de la base de datos</h2>
          </div>
          <p>
            Copia el archivo <span className="font-mono">database.sqlite</span> a una memoria USB u
            otra ubicación física para respaldar la contabilidad del inventario. El respaldo es
            consistente y se genera sin cerrar la aplicación.
          </p>
          <div className="card-actions mt-2">
            <button className="btn btn-soft btn-primary" onClick={guardar} disabled={enviando}>
              {enviando && <span className="loading loading-spinner loading-sm" />}
              Guardar respaldo…
            </button>
          </div>
          {ruta && (
            <div className="alert alert-success mt-3">
              <span>
                Respaldo guardado en: <span className="font-mono break-all">{ruta}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
