import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import BuscarCrear from './BuscarCrear.jsx'
import { formatearNumero } from '../lib/util.js'

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const nuevaLinea = () => ({ key: crypto.randomUUID(), id_suministro: '', numero_tarjeta: '', cantidad: '', precio_unitario: '', numero_lote: '', fecha_vencimiento: '', id_lote: '', observaciones: '' })
const invocar = async (accion, datos) => {
  const r = await window.api.inventario.documentos(accion, datos)
  if (!r.ok) throw new Error(r.error)
  return r.data
}
const etiqueta = (s) => `${s.codigo_base || s.codigo_producto}${s.codigo_presentacion ? ` / ${s.codigo_presentacion}` : ''} — ${s.descripcion_completa} — ${s.cantidad_unitaria}`

export default function DocumentoInventario({ tipo, onCerrar, onGuardado }) {
  const [catalogos, setCatalogos] = useState(null)
  const [form, setForm] = useState({ tipo, fecha: hoy(), id_entidad: '', id_destino: '', id_modalidad: '', referencia: '', observaciones: '', lineas: [nuevaLinea()] })
  const [creando, setCreando] = useState(null)
  const [nuevo, setNuevo] = useState({})
  const [error, setError] = useState('')
  const [errorCrear, setErrorCrear] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [plan, setPlan] = useState(null)
  const salida = tipo === 'Salida'
  const inicial = tipo === 'Inicial'
  const recargar = async () => { const c = await invocar('catalogos'); setCatalogos(c); return c }
  useEffect(() => { recargar().catch((e) => setError(e.message)) }, [])
  const cambiar = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setPlan(null) }
  const linea = (key, valores) => { setForm((f) => ({ ...f, lineas: f.lineas.map((l) => l.key === key ? { ...l, ...valores } : l) })); setPlan(null) }
  const abrirCrear = (tipoCatalogo, key, nombre = '') => {
    setCreando({ tipo: tipoCatalogo, key }); setErrorCrear('')
    setNuevo({ nombre, nit: '', codigo_producto: '', codigo_presentacion: '', presentacion: '', numero_tarjeta: '', minimo: '', maximo: '', columna_descargo: 'OTROS' })
  }
  const editarPresentacion = (s, key) => {
    setCreando({ tipo: 'presentacion', key }); setErrorCrear('')
    setNuevo({ id_suministro: s.id_suministro, codigo_producto: s.codigo_base || s.codigo_producto,
      nombre: s.nombre_producto || s.descripcion_completa, codigo_presentacion: s.codigo_presentacion || '',
      presentacion: s.cantidad_unitaria, numero_tarjeta: s.numero_tarjeta || '', minimo: s.minimo ?? '', maximo: s.maximo ?? '' })
  }
  const crear = async (e) => {
    e.preventDefault(); setOcupado(true); setErrorCrear('')
    try {
      const r = await invocar('crearCatalogo', { ...nuevo, tipo: creando.tipo })
      await recargar()
      if (creando.tipo === 'presentacion') {
        setForm((f) => ({ ...f, lineas: f.lineas.map((l) => l.key === creando.key || Number(l.id_suministro) === r.id_suministro ? { ...l, id_suministro: r.id_suministro, numero_tarjeta: r.numero_tarjeta || '' } : l) }))
        setPlan(null)
      }
      else cambiar(creando.tipo === 'proveedor' ? 'id_entidad' : creando.tipo === 'destino' ? 'id_destino' : 'id_modalidad', r.id_entidad || r.id_destino || r.id_modalidad)
      setCreando(null)
    } catch (err) { setErrorCrear(err.message) } finally { setOcupado(false) }
  }
  const guardar = async (e) => {
    e.preventDefault(); setError(''); setOcupado(true)
    try {
      if (salida && !plan) { setPlan(await invocar('previsualizar', form)); return }
      const r = await invocar('guardar', { ...form, plan: plan?.map((r) => r.lotes.map((l) => [l.id_lote, l.cantidad])) })
      onGuardado(r)
    } catch (err) { setError(err.message); setPlan(null) } finally { setOcupado(false) }
  }
  const disponible = (id) => catalogos?.lotes.filter((l) => l.id_suministro === Number(id) && l.fecha_vencimiento >= form.fecha).reduce((a, l) => a + l.saldo_lote, 0) || 0
  const proveedor = catalogos?.entidades.find((e) => e.id_entidad === Number(form.id_entidad))
  const campo = (titulo, key, type = 'text', requerido = false) => <label className="form-control" key={key}><span className="label-text mb-1">{titulo}{requerido ? ' *' : ''}</span><input className="input input-bordered input-sm w-full" type={type} value={nuevo[key] ?? ''} required={requerido} onChange={(e) => {
    const v = e.target.value
    const existente = key === 'codigo_producto' ? catalogos.productos.find((p) => p.codigo.toLowerCase() === v.trim().toLowerCase()) : null
    setNuevo((n) => ({ ...n, [key]: v, ...(existente ? { nombre: existente.nombre } : {}) }))
  }} /></label>
  return <>
    <Modal><div className="modal-box w-full max-w-7xl max-h-[94vh] overflow-y-auto">
      <h3 className="text-xl font-bold">{salida ? 'Nueva entrega a distrito / destino' : inicial ? 'Carga de inventario inicial' : 'Nueva entrada de suministros'}</h3>
      <p className="text-sm opacity-60 mt-1">Un documento, varios productos. Las cantidades y costos corresponden a la presentación seleccionada.</p>
      {error && <div role="alert" className="alert alert-error mt-3">{error}</div>}
      {!catalogos ? <div className="py-8"><span className="loading loading-spinner" /><button className="btn btn-ghost ml-3" onClick={onCerrar}>Cerrar</button></div> : <form onSubmit={guardar} className="mt-4 space-y-4">
        <fieldset disabled={ocupado} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!salida && !inicial && <label className="form-control"><span className="label-text mb-1">Tipo de entrada</span><select className="select select-bordered select-sm" value={form.tipo} onChange={(e) => cambiar('tipo', e.target.value)}><option value="Entrada_Compra">Compra / traslado</option><option value="Entrada_Donacion">Recepción por donación (solo inventario)</option></select></label>}
          <label className="form-control"><span className="label-text mb-1">{salida ? 'Fecha de entrega' : 'Fecha de ingreso'} *</span><input type="date" className="input input-bordered input-sm" value={form.fecha} required onChange={(e) => cambiar('fecha', e.target.value)} /></label>
          {!inicial && <div className="form-control"><span className="label-text mb-1">{salida ? 'Distrito / destino' : 'Proveedor / remitente'} *</span><BuscarCrear opciones={(salida ? catalogos.destinos : catalogos.entidades).map((e) => ({ value: e.id_destino || e.id_entidad, label: salida ? e.nombre_destino : `${e.nombre_razon_social}${e.nit_entidad ? ` · NIT ${e.nit_entidad}` : ''}` }))} valor={salida ? form.id_destino : form.id_entidad} onChange={(v) => cambiar(salida ? 'id_destino' : 'id_entidad', v)} onCrear={(t) => abrirCrear(salida ? 'destino' : 'proveedor', null, t)} placeholder={salida ? 'Buscar distrito o destino' : 'Buscar proveedor por nombre o NIT'} /></div>}
          {!salida && !inicial && <label className="form-control"><span className="label-text mb-1">NIT del proveedor</span><input readOnly className="input input-bordered input-sm bg-base-200" value={proveedor?.nit_entidad || ''} placeholder="Se completa al seleccionar" /></label>}
          <label className="form-control"><span className="label-text mb-1">{salida ? 'Documento de referencia (opcional)' : inicial ? 'Referencia del inventario inicial' : 'Factura / forma de traslado *'}</span><input className="input input-bordered input-sm" value={form.referencia} required={!salida && !inicial} onChange={(e) => cambiar('referencia', e.target.value)} /></label>
          {!salida && !inicial && <div className="form-control"><span className="label-text mb-1">Modalidad de compra</span><BuscarCrear opciones={catalogos.modalidades.map((m) => ({ value: m.id_modalidad, label: m.nombre }))} valor={form.id_modalidad} onChange={(v) => cambiar('id_modalidad', v)} onCrear={(t) => abrirCrear('modalidad', null, t)} placeholder="Seleccionar o crear modalidad" /></div>}
          <label className="form-control"><span className="label-text mb-1">Observaciones generales</span><input className="input input-bordered input-sm" value={form.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} /></label>
        </fieldset>
        <div className="space-y-3">
          {form.lineas.map((l, i) => {
            const s = catalogos.suministros.find((s) => s.id_suministro === Number(l.id_suministro))
            const lotes = catalogos.lotes.filter((lt) => lt.id_suministro === Number(l.id_suministro))
            return <fieldset disabled={ocupado} key={l.key} className="rounded-xl border border-base-300 bg-base-200/40 p-3">
              <div className="flex justify-between items-center mb-2"><span className="font-semibold text-sm">Producto {i + 1}</span><div className="flex gap-2">{s && <button type="button" className="btn btn-ghost btn-xs" onClick={() => editarPresentacion(s, l.key)}>Datos de presentación / niveles</button>}<button type="button" className="btn btn-ghost btn-xs" disabled={form.lineas.length === 1} onClick={() => cambiar('lineas', form.lineas.filter((r) => r.key !== l.key))}>Quitar</button></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2"><span className="label-text block mb-1">Producto y presentación *</span><BuscarCrear opciones={catalogos.suministros.map((s) => ({ value: s.id_suministro, label: etiqueta(s) }))} valor={l.id_suministro} onChange={(v) => { const s = catalogos.suministros.find((s) => s.id_suministro === Number(v)); linea(l.key, { id_suministro: v, numero_tarjeta: s?.numero_tarjeta || '', id_lote: '', numero_lote: '', fecha_vencimiento: '', precio_unitario: '' }) }} onCrear={!salida ? (t) => abrirCrear('presentacion', l.key, t) : undefined} placeholder="Buscar por código, nombre, presentación" /></div>
                <label className="form-control"><span className="label-text mb-1">No. tarjeta kardex *</span><input className={`input input-bordered input-sm ${s?.numero_tarjeta ? 'bg-base-200' : ''}`} required readOnly={!!s?.numero_tarjeta} value={l.numero_tarjeta} onChange={(e) => linea(l.key, { numero_tarjeta: e.target.value })} placeholder="Se conserva por presentación" /></label>
                <label className="form-control"><span className="label-text mb-1">Cantidad · {s?.cantidad_unitaria || 'seleccione presentación'} *</span><input className="input input-bordered input-sm" type="number" min="1" step="1" required value={l.cantidad} onChange={(e) => linea(l.key, { cantidad: e.target.value })} /></label>
                {salida ? <>
                  <div className="text-sm flex items-center">Disponible vigente: <strong className="ml-2">{disponible(l.id_suministro)} {s?.cantidad_unitaria}</strong></div>
                  <label className="form-control lg:col-span-2"><span className="label-text mb-1">Lote de salida</span><select className="select select-bordered select-sm" value={l.id_lote} onChange={(e) => linea(l.key, { id_lote: e.target.value })}><option value="">Automático: primero en vencer (ver propuesta antes de guardar)</option>{lotes.filter((lt) => lt.saldo_lote > 0 && lt.fecha_vencimiento >= form.fecha).map((lt) => <option key={lt.id_lote} value={lt.id_lote}>{lt.numero_lote} · vence {lt.fecha_vencimiento} · disponible {lt.saldo_lote} · Q {lt.precio_unitario}</option>)}</select></label>
                  <div className="text-sm flex items-center">Saldo previsto: {disponible(l.id_suministro) - form.lineas.filter((r) => Number(r.id_suministro) === Number(l.id_suministro)).reduce((a, r) => a + Number(r.cantidad || 0), 0)}</div>
                </> : <>
                  <label className="form-control"><span className="label-text mb-1">Número de lote *</span><input list={`lotes-${l.key}`} className="input input-bordered input-sm" required value={l.numero_lote} onChange={(e) => { const nl = e.target.value; const anterior = lotes.find((lt) => lt.numero_lote.toLowerCase() === nl.toLowerCase()); linea(l.key, { numero_lote: nl, fecha_vencimiento: anterior?.fecha_vencimiento || '' }) }} /><datalist id={`lotes-${l.key}`}>{[...new Set(lotes.map((lt) => lt.numero_lote))].map((nl) => <option key={nl} value={nl} />)}</datalist></label>
                  <label className="form-control"><span className="label-text mb-1">Vencimiento *</span><input type="date" className="input input-bordered input-sm" required value={l.fecha_vencimiento} onChange={(e) => linea(l.key, { fecha_vencimiento: e.target.value })} /></label>
                  <label className="form-control"><span className="label-text mb-1">Costo por presentación (Q) *</span><input className="input input-bordered input-sm" type="number" min="0" step="0.01" required value={l.precio_unitario} onChange={(e) => linea(l.key, { precio_unitario: e.target.value })} /></label>
                  <div className="text-sm flex items-center">Total: <strong className="ml-2">Q {formatearNumero(Number(l.cantidad || 0) * Number(l.precio_unitario || 0))}</strong></div>
                </>}
                <label className="form-control sm:col-span-2 lg:col-span-4"><span className="label-text mb-1">Observaciones del producto</span><input className="input input-bordered input-sm" value={l.observaciones} onChange={(e) => linea(l.key, { observaciones: e.target.value })} /></label>
              </div>
            </fieldset>
          })}
        </div>
        <button className="btn btn-outline btn-sm" type="button" disabled={ocupado} onClick={() => cambiar('lineas', [...form.lineas, nuevaLinea()])}>+ Agregar producto</button>
        {!salida && <p className="text-right font-bold">Total del documento: Q {formatearNumero(form.lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0))}</p>}
        {plan && <div className="rounded-lg border border-info p-4"><h4 className="font-bold mb-2">Revisar lotes antes de confirmar</h4>{plan.map((p, i) => <div key={i} className="text-sm mb-2"><strong>{p.suministro.descripcion_completa} · {p.suministro.cantidad_unitaria}</strong>{p.lotes.map((l) => <p key={l.id_lote}>Lote {l.numero_lote} · vence {l.fecha_vencimiento}: entregar {l.cantidad}</p>)}</div>)}<p className="text-xs opacity-70">La disponibilidad se vuelve a comprobar al confirmar.</p></div>}
        <div className="modal-action sticky bottom-0 flex-col-reverse gap-2 bg-base-100 py-3 sm:flex-row sm:justify-end"><button className="btn btn-ghost w-full sm:w-auto" type="button" disabled={ocupado} onClick={onCerrar}>Cancelar</button><button className="btn btn-primary w-full sm:w-auto" disabled={ocupado}>{ocupado ? 'Procesando…' : salida ? plan ? 'Confirmar entrega completa' : 'Revisar lotes de salida' : 'Guardar entrada completa'}</button></div>
      </form>}
    </div></Modal>
    {creando && <Modal><div className="modal-box max-w-2xl"><h3 className="text-lg font-bold">{creando.tipo === 'presentacion' ? nuevo.id_suministro ? 'Completar datos de la presentación' : 'Crear producto / presentación' : creando.tipo === 'proveedor' ? 'Nuevo proveedor / remitente' : creando.tipo === 'destino' ? 'Nuevo destino' : 'Nueva modalidad'}</h3>
      {errorCrear && <div role="alert" className="alert alert-error mt-2">{errorCrear}</div>}
      <form onSubmit={crear} className="mt-4 space-y-3">
        {creando.tipo === 'presentacion' ? <>
          <label className="form-control"><span className="label-text mb-1">Producto existente (o complete un código nuevo abajo)</span><select className="select select-bordered select-sm" value={catalogos.productos.find((p) => p.codigo === nuevo.codigo_producto)?.id_producto || ''} onChange={(e) => { const p = catalogos.productos.find((p) => p.id_producto === Number(e.target.value)); setNuevo((n) => ({ ...n, codigo_producto: p?.codigo || '', nombre: p?.nombre || '' })) }}><option value="">Nuevo producto</option>{catalogos.productos.map((p) => <option value={p.id_producto} key={p.id_producto}>{p.codigo} — {p.nombre}</option>)}</select></label>
          <div className="grid sm:grid-cols-2 gap-3">{campo('Código de producto', 'codigo_producto', 'text', true)}{campo('Nombre / descripción / concentración', 'nombre', 'text', true)}{campo('Código de presentación', 'codigo_presentacion', 'text', true)}{campo('Presentación / contenido (ej. Caja de 50 unidades)', 'presentacion', 'text', true)}{campo('Número de tarjeta kardex', 'numero_tarjeta', 'text', true)}{campo('Existencia mínima', 'minimo', 'number')}{campo('Existencia máxima', 'maximo', 'number')}</div>
        </> : <>{campo(creando.tipo === 'proveedor' ? 'Nombre / razón social' : 'Nombre', 'nombre', 'text', true)}{creando.tipo === 'proveedor' && campo('NIT (si corresponde)', 'nit')}{creando.tipo === 'destino' && <p className="text-sm opacity-60">Se conservará el nombre y sus entregas se agruparán en «Otros» en el descargo mensual.</p>}</>}
        <div className="modal-action"><button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => setCreando(null)}>Cancelar</button><button className="btn btn-primary" disabled={ocupado}>Guardar y seleccionar</button></div>
      </form>
    </div></Modal>}
  </>
}
