import { useState, useRef, useEffect } from 'react'

export default function SelectBuscador({ opciones, valor, onChange, placeholder = "Buscar...", disabled = false }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const ref = useRef(null)

  const seleccion = opciones.find(o => o.value == valor)

  useEffect(() => {
    const clickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', clickFuera)
    return () => document.removeEventListener('mousedown', clickFuera)
  }, [])

  const filtradas = opciones.filter(o => 
    o.label.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        className={`input input-bordered w-full flex items-center justify-between overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed bg-base-200' : 'cursor-pointer'}`}
        onClick={() => {
          if (disabled) return;
          setAbierto(!abierto); 
          if (!abierto) setBusqueda('');
        }}
      >
        <span className={`truncate ${seleccion ? '' : 'text-base-content/50'}`}>
          {seleccion ? seleccion.label : placeholder}
        </span>
        <span className="text-xs opacity-50 ml-2">▼</span>
      </div>

      {abierto && !disabled && (
        <div className="absolute z-[100] w-full mt-1 bg-base-100 border border-base-300 rounded-box shadow-2xl max-h-64 flex flex-col">
          <div className="p-2 border-b border-base-200 shrink-0">
            <input 
              type="text" 
              className="input input-sm input-bordered w-full" 
              placeholder="Escriba para buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {filtradas.length === 0 ? (
              <div className="p-2 text-sm text-center opacity-50">Sin resultados</div>
            ) : (
              filtradas.map(o => (
                <div 
                  key={o.value} 
                  className={`px-3 py-2 text-sm rounded-btn cursor-pointer mb-1 ${o.value == valor ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
                  onClick={() => {
                    onChange(o.value)
                    setAbierto(false)
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
