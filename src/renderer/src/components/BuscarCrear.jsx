import { useEffect, useRef, useState } from 'react'

const clave = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function BuscarCrear({ opciones, valor, onChange, onCrear, placeholder = 'Buscar…', disabled = false }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const ref = useRef(null)
  const seleccionado = opciones.find((o) => String(o.value) === String(valor))
  const encontrados = opciones.filter((o) => clave(o.label).includes(clave(texto))).slice(0, 40)
  useEffect(() => {
    const cerrar = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])
  const elegir = (opcion) => { onChange(opcion.value); setAbierto(false); setTexto('') }
  return <div ref={ref} className="relative">
    <input className="input input-bordered input-sm w-full" disabled={disabled} role="combobox" aria-expanded={abierto} aria-autocomplete="list" aria-label={placeholder}
      placeholder={placeholder} value={abierto ? texto : seleccionado?.label || ''}
      onFocus={() => { setTexto(''); setActivo(0); setAbierto(true) }}
      onChange={(e) => { setTexto(e.target.value); setActivo(0); setAbierto(true) }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Tab') setAbierto(false)
        if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, encontrados.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
        if (e.key === 'Enter' && abierto) { e.preventDefault(); if (encontrados[activo]) elegir(encontrados[activo]) }
      }} />
    {abierto && <div className="absolute z-[120] mt-1 max-h-64 w-full min-w-56 overflow-auto rounded-lg border border-base-300 bg-base-100 shadow-xl" role="listbox">
      {encontrados.map((o, i) => <button key={o.value} type="button" role="option" aria-selected={i === activo} className={`block w-full px-3 py-2 text-left text-sm ${i === activo ? 'bg-base-200' : 'hover:bg-base-200'}`} onClick={() => elegir(o)}>{o.label}</button>)}
      {!encontrados.length && <p className="p-3 text-sm opacity-60">Sin coincidencias.</p>}
      {onCrear && <button type="button" className="block w-full border-t border-base-300 px-3 py-2 text-left text-sm font-semibold text-primary" onClick={() => { setAbierto(false); onCrear(texto) }}>+ Crear nuevo</button>}
    </div>}
  </div>
}
