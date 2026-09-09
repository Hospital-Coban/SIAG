export default function Toast({ mensaje, tipo, onCerrar }) {
  if (!mensaje) return null

  const texto = typeof mensaje === 'string'
    ? mensaje
    : (mensaje?.message || JSON.stringify(mensaje))

  return (
    <div className="toast toast-end toast-bottom z-50">
      <div className={`alert ${tipo === 'error' ? 'alert-error' : 'alert-success'}`}>
        <span>{texto}</span>
        <button className="btn btn-ghost btn-xs" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

