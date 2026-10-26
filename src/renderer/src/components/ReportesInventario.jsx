import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import BuscarCrear from './BuscarCrear.jsx'
import { generarExcelInventario } from '../../../shared/inventario.excel.js'

const pedir = async (accion, datos) => {
  const r = await window.api.inventario.documentos(accion, datos)
  if (!r.ok) throw new Error(r.error)
  return r.data
}
const CONFIG = [
  ['institucion', 'Institución / dirección departamental'], ['unidad', 'Unidad / almacén'],
  ['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['ue', 'Unidad ejecutora'],
  ['municipio', 'Municipio'], ['distrito', 'Distrito'], ['servicio', 'Servicio']
]

export default function ReportesInventario({ onCerrar }) {
  const [catalogos, setCatalogos] = useState(null)
  const [config, setConfig] = useState({})
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [suministro, setSuministro] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { pedir('catalogos').then((c) => { setCatalogos(c); setConfig(c.configuracion) }).catch((e) => setError(e.message)) }, [])
  const exportar = async (tipo) => {
    setOcupado(true); setError(''); setMensaje('')
    try {
      if (desde && hasta && desde > hasta) throw new Error('Revise el rango de fechas.')
      const datos = await pedir(tipo === 'tarjeta' ? 'tarjeta' : 'reporte', { id_suministro: suministro })
      const buffer = await generarExcelInventario({ tipo, datos, config, desde, hasta })
      const r = await window.api.inventario.exportarExcel(buffer, `${tipo === 'tarjeta' ? 'Kardex' : 'Ingresos'}_${desde || 'inicio'}_${hasta || 'actual'}.xlsx`)
      if (!r.ok) throw new Error(r.error)
      if (!r.data?.cancelado) setMensaje('Reporte exportado correctamente.')
    } catch (e) { setError(e.message) } finally { setOcupado(false) }
  }
  return <Modal><div className="modal-box max-w-4xl"><h3 className="text-lg font-bold">Reportes y datos de la tarjeta</h3>
    {error && <div role="alert" className="alert alert-error mt-3">{error}</div>}{mensaje && <p className="text-success mt-3">{mensaje}</p>}
    <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <label className="form-control"><span className="label-text">Desde</span><input type="date" className="input input-bordered input-sm" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
      <label className="form-control"><span className="label-text">Hasta</span><input type="date" className="input input-bordered input-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
    </div>
    <button className="btn btn-success btn-outline btn-sm mt-3" disabled={ocupado || !catalogos} onClick={() => exportar('ingresos')}>Exportar reporte de ingresos</button>
    <div className="mt-4"><span className="label-text block mb-1">Tarjeta por suministro y presentación</span><BuscarCrear opciones={(catalogos?.suministros || []).map((s) => ({ value: s.id_suministro, label: `${s.codigo_producto} — ${s.descripcion_completa} — ${s.cantidad_unitaria}` }))} valor={suministro} onChange={setSuministro} placeholder="Buscar producto, código o presentación" /></div>
    <button className="btn btn-info btn-outline btn-sm mt-3" disabled={ocupado || !suministro} onClick={() => exportar('tarjeta')}>Exportar tarjeta kardex</button>
    <details className="mt-5 rounded-lg border border-base-300 p-3"><summary className="cursor-pointer font-semibold">Datos institucionales para los encabezados</summary><div className="grid sm:grid-cols-2 gap-3 mt-3">{CONFIG.map(([key, label]) => <label key={key} className="form-control"><span className="label-text">{label}</span><input className="input input-bordered input-sm" value={config[key] || ''} onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))} /></label>)}</div><button className="btn btn-primary btn-sm mt-3" disabled={ocupado} onClick={async () => { setOcupado(true); try { await pedir('configurar', config); setMensaje('Encabezados guardados.') } catch (e) { setError(e.message) } finally { setOcupado(false) } }}>Guardar encabezados</button></details>
    <div className="modal-action"><button className="btn" disabled={ocupado} onClick={onCerrar}>Cerrar</button></div>
  </div></Modal>
}
