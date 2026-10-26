import { useEffect, useState } from 'react'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'
import Modal from '../components/Modal.jsx'
import BuscarCrear from '../components/BuscarCrear.jsx'
import DocumentoInventario from '../components/DocumentoInventario.jsx'
import ReportesInventario from '../components/ReportesInventario.jsx'
import { formatearFecha, formatearNumero } from '../lib/util.js'

const ETIQUETAS = { Entrada_Compra: 'Entrada compra / traslado', Entrada_Donacion: 'Entrada por donación', Salida: 'Salida', Reajuste: 'Reajuste / inicial' }
const ESTILOS = { Entrada_Compra: 'badge-success', Entrada_Donacion: 'badge-primary', Salida: 'badge-error', Reajuste: 'badge-warning' }
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Kardex() {
  const [filas, setFilas] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [tipoDocumento, setTipoDocumento] = useState(null)
  const [reportes, setReportes] = useState(false)
  const [descargo, setDescargo] = useState(null)
  const [ajuste, setAjuste] = useState(null)
  const [catalogos, setCatalogos] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  const [toast, mostrarToast, cerrarToast] = useToast()

  const cargar = async () => {
    setCargando(true)
    try {
      const r = await window.api.kardex.listar({ tipo_movimiento: filtroTipo || undefined })
      if (!r.ok) throw new Error(r.error)
      setFilas(r.data)
    } catch (e) { mostrarToast(e.message, 'error') } finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [filtroTipo])
  const guardado = (r) => { setTipoDocumento(null); setAjuste(null); mostrarToast(`Documento ${r.numero} guardado correctamente`); cargar() }
  const abrirAjuste = async () => {
    try {
      const r = await window.api.inventario.documentos('catalogos')
      if (!r.ok) throw new Error(r.error)
      setCatalogos(r.data); setErrorModal('')
      setAjuste({ fecha: hoy(), id_suministro: '', id_lote: '', numero_tarjeta: '', cantidad: '', referencia: '', observaciones: '' })
    } catch (e) { mostrarToast(e.message, 'error') }
  }
  const reajustar = async (e) => {
    e.preventDefault(); setOcupado(true); setErrorModal('')
    try {
      const r = await window.api.inventario.documentos('reajustar', ajuste)
      if (!r.ok) throw new Error(r.error)
      guardado(r.data)
    } catch (err) { setErrorModal(err.message) } finally { setOcupado(false) }
  }
  const exportarDescargo = async (e) => {
    e.preventDefault(); setOcupado(true); setErrorModal('')
    try {
      const r = await window.api.inventario.exportarDescargo({ mes: Number(descargo.mes), anio: Number(descargo.anio) })
      if (!r.ok) throw new Error(r.error)
      if (!r.data?.cancelado) { mostrarToast('Descargo mensual exportado'); setDescargo(null) }
    } catch (err) { setErrorModal(err.message) } finally { setOcupado(false) }
  }
  const visibles = filas.filter((f) => Object.values(f).join(' ').toLowerCase().includes(busqueda.trim().toLowerCase()))

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <div><h1 className="text-2xl font-bold">Kardex e inventario</h1><p className="text-sm opacity-60">Registre documentos completos con varios productos y presentaciones.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-success btn-outline" onClick={() => setTipoDocumento('Entrada_Compra')}>Registrar entrada</button>
        <button className="btn btn-error btn-outline" onClick={() => setTipoDocumento('Salida')}>Registrar salida</button>
        <button className="btn btn-warning btn-outline" onClick={abrirAjuste}>Reajuste</button>
        <button className="btn btn-neutral btn-outline" onClick={() => setTipoDocumento('Inicial')}>Inventario inicial</button>
        <button className="btn btn-info btn-outline" onClick={() => setReportes(true)}>Reportes / tarjeta</button>
        <button className="btn btn-info btn-outline" onClick={() => { setErrorModal(''); setDescargo({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }) }}>Descargo mensual</button>
      </div>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="form-control"><span className="label-text">Tipo de movimiento</span><select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option value="">Todos</option>{Object.entries(ETIQUETAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
      <label className="form-control w-full sm:w-80"><span className="label-text">Buscar movimiento</span><input className="input input-bordered input-sm" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Producto, presentación, factura, distrito, lote…" /></label>
      <span className="text-sm opacity-60">{visibles.length} movimiento(s), últimos 1000</span>
    </div>
    <div className="rounded-box bg-base-100 shadow-sm p-4 overflow-auto max-h-[70vh]">
      {cargando ? <span className="loading loading-spinner loading-lg" /> : <table className="table table-sm table-zebra">
        <thead className="sticky top-0 bg-base-200"><tr>{['Tarjeta kardex', 'Fecha', 'Tipo', 'Producto / presentación', 'Lote', 'Vencimiento', 'Remitente / destino', 'Documento / observaciones', 'Cantidad'].map((t) => <th key={t}>{t}</th>)}</tr></thead>
        <tbody>{!visibles.length && <tr><td colSpan={9} className="text-center py-8 opacity-60">Sin movimientos.</td></tr>}{visibles.map((f) => <tr key={f.id_transaccion}>
          <td className="font-mono">{f.numero_kardex}</td><td className="whitespace-nowrap">{formatearFecha(f.fecha_movimiento)}</td>
          <td><span className={`badge badge-sm whitespace-nowrap ${ESTILOS[f.tipo_movimiento] || ''}`}>{ETIQUETAS[f.tipo_movimiento] || f.tipo_movimiento}</span></td>
          <td><div className="font-mono text-xs opacity-60">{f.codigo_producto}</div><div>{f.descripcion_completa}</div><div className="text-xs opacity-70">{f.cantidad_unitaria}</div></td>
          <td>{f.numero_lote}</td><td className="whitespace-nowrap">{formatearFecha(f.fecha_vencimiento)}</td><td>{f.destino || f.nombre_razon_social}</td>
          <td><div>{f.documento_referencia || '—'}</div><div className="text-xs opacity-60">{f.numero_documento}</div><div className="text-xs opacity-60">{[f.observaciones_documento, f.observaciones].filter(Boolean).join(' · ')}</div></td>
          <td className={`text-right font-semibold ${f.cantidad < 0 ? 'text-error' : 'text-success'}`}>{f.cantidad > 0 ? '+' : ''}{formatearNumero(f.cantidad)}</td>
        </tr>)}</tbody>
      </table>}
    </div>
    {tipoDocumento && <DocumentoInventario tipo={tipoDocumento} onCerrar={() => setTipoDocumento(null)} onGuardado={guardado} />}
    {reportes && <ReportesInventario onCerrar={() => setReportes(false)} />}
    {descargo && <Modal><div className="modal-box"><h3 className="text-lg font-bold">Descargo mensual por distrito</h3>{errorModal && <div className="alert alert-error mt-3">{errorModal}</div>}<form onSubmit={exportarDescargo} className="mt-4 space-y-3"><label className="form-control"><span className="label-text">Mes</span><select className="select select-bordered" value={descargo.mes} onChange={(e) => setDescargo((d) => ({ ...d, mes: e.target.value }))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label><label className="form-control"><span className="label-text">Año</span><input className="input input-bordered" type="number" required min="2000" max="2200" value={descargo.anio} onChange={(e) => setDescargo((d) => ({ ...d, anio: e.target.value }))} /></label><div className="modal-action"><button className="btn btn-ghost" type="button" disabled={ocupado} onClick={() => setDescargo(null)}>Cancelar</button><button className="btn btn-primary" disabled={ocupado}>Exportar Excel</button></div></form></div></Modal>}
    {ajuste && <Modal><div className="modal-box max-w-2xl"><h3 className="text-lg font-bold">Reajuste de existencias</h3><p className="text-sm opacity-60 mt-1">Cantidad positiva para aumentar, negativa para disminuir. El motivo queda en la tarjeta.</p>{errorModal && <div className="alert alert-error mt-3">{errorModal}</div>}<form onSubmit={reajustar} className="space-y-3 mt-4">
      <label className="form-control"><span className="label-text">Fecha *</span><input type="date" className="input input-bordered input-sm" required value={ajuste.fecha} onChange={(e) => setAjuste((a) => ({ ...a, fecha: e.target.value }))} /></label>
      <div><span className="label-text">Producto / presentación *</span><BuscarCrear opciones={catalogos.suministros.map((s) => ({ value: s.id_suministro, label: `${s.codigo_producto} — ${s.descripcion_completa} — ${s.cantidad_unitaria}` }))} valor={ajuste.id_suministro} onChange={(v) => setAjuste((a) => ({ ...a, id_suministro: v, id_lote: '', numero_tarjeta: catalogos.suministros.find((s) => s.id_suministro === Number(v))?.numero_tarjeta || '' }))} placeholder="Buscar producto o presentación" /></div>
      <label className="form-control"><span className="label-text">Lote *</span><select className="select select-bordered select-sm" required value={ajuste.id_lote} onChange={(e) => setAjuste((a) => ({ ...a, id_lote: e.target.value }))}><option value="">Seleccione lote</option>{catalogos.lotes.filter((l) => l.id_suministro === Number(ajuste.id_suministro)).map((l) => <option key={l.id_lote} value={l.id_lote}>{l.numero_lote} · vence {l.fecha_vencimiento} · saldo {l.saldo_lote} · Q {l.precio_unitario}</option>)}</select></label>
      <label className="form-control"><span className="label-text">Tarjeta kardex *</span><input className="input input-bordered input-sm" required value={ajuste.numero_tarjeta} readOnly={!!catalogos.suministros.find((s) => s.id_suministro === Number(ajuste.id_suministro))?.numero_tarjeta} onChange={(e) => setAjuste((a) => ({ ...a, numero_tarjeta: e.target.value }))} /></label>
      <label className="form-control"><span className="label-text">Cantidad (+ / −) *</span><input className="input input-bordered input-sm" required type="number" step="1" value={ajuste.cantidad} onChange={(e) => setAjuste((a) => ({ ...a, cantidad: e.target.value }))} /></label>
      <label className="form-control"><span className="label-text">Documento de referencia</span><input className="input input-bordered input-sm" value={ajuste.referencia} onChange={(e) => setAjuste((a) => ({ ...a, referencia: e.target.value }))} /></label>
      <label className="form-control"><span className="label-text">Motivo *</span><textarea className="textarea textarea-bordered" required value={ajuste.observaciones} onChange={(e) => setAjuste((a) => ({ ...a, observaciones: e.target.value }))} /></label>
      <div className="modal-action"><button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => setAjuste(null)}>Cancelar</button><button className="btn btn-primary" disabled={ocupado}>Guardar reajuste</button></div>
    </form></div></Modal>}
    <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
  </div>
}
