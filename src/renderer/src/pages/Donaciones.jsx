import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import { CAMPOS_DONACION } from '../../../shared/donaciones.js'
import { formatearFecha, formatearNumero } from '../lib/util.js'
import SelectBuscador from '../components/SelectBuscador.jsx'
import Modal from '../components/Modal.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'

const inicial = () => Object.fromEntries(CAMPOS_DONACION.map(([k]) => [k, k === 'ano_donacion' ? new Date().getFullYear() : '']))
const normalizar = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
const total = (f) => Number(f.cantidad || 0) * Number(f.precio_unitario || 0)

export default function Donaciones() {
  const [filas, setFilas] = useState([])
  const [ongs, setOngs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [donante, setDonante] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [toast, mostrarToast, cerrarToast] = useToast()

  const cargar = async () => {
    try {
      const [d, e] = await Promise.all([window.api.donaciones.listar(), window.api.donaciones.listarOng()])
      if (!d.ok || !e.ok) throw new Error(d.error || e.error)
      setFilas(d.data)
      setOngs(e.data)
    } catch (err) { mostrarToast(err.message, 'error') }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  const opcionesDonantes = useMemo(() => [...new Map(filas.map((f) => [
    f.id_ong, { value: f.id_ong, label: f.nombre_ong }
  ])).values()].sort((a, b) => a.label.localeCompare(b.label)), [filas])

  const filtradas = useMemo(() => filas.filter((f) => {
    if (donante && f.id_ong !== Number(donante)) return false
    const fecha = f.fecha_entrega || ''
    if ((desde || hasta) && !fecha) return false
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return normalizar(Object.values(f).join(' ')).includes(normalizar(busqueda))
  }), [filas, donante, desde, hasta, busqueda])

  const guardar = async (event) => {
    event.preventDefault()
    setOcupado(true)
    try {
      const res = form.id_expediente
        ? await window.api.donaciones.actualizar(form.id_expediente, form)
        : await window.api.donaciones.crear(form)
      if (!res.ok) throw new Error(res.error)
      setForm(null)
      mostrarToast('Donación guardada correctamente')
      await cargar()
    } catch (err) { mostrarToast(err.message, 'error') }
    finally { setOcupado(false) }
  }

  const eliminar = async () => {
    setOcupado(true)
    try {
      const res = await window.api.donaciones.eliminar(eliminando.id_expediente)
      if (!res.ok) throw new Error(res.error)
      setEliminando(null)
      await cargar()
      mostrarToast('Donación eliminada')
    } catch (err) { mostrarToast(err.message, 'error') }
    finally { setOcupado(false) }
  }

  const exportar = async () => {
    setOcupado(true)
    try {
      const libro = new ExcelJS.Workbook()
      const hoja = libro.addWorksheet('Donaciones', { views: [{ state: 'frozen', ySplit: 1 }] })
      const columnas = [['numero', 'No.', 'number'], ...CAMPOS_DONACION]
      hoja.columns = columnas.map(([key, header, tipo]) => ({ key, header, width: key === 'descripcion_completa' ? 48 : tipo === 'date' ? 22 : 28 }))
      hoja.addTable({
        name: 'TablaDonaciones', ref: 'A1', headerRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: columnas.map(([, name]) => ({ name, filterButton: true })),
        rows: filtradas.map((f, i) => columnas.map(([k, , tipo]) => {
          if (k === 'numero') return i + 1
          if (k === 'monto_total') return total(f)
          if (tipo === 'date') return f[k] ? new Date(`${f[k]}T00:00:00Z`) : null
          if (tipo === 'number' || tipo === 'money') return f[k] === '' || f[k] == null ? null : Number(f[k])
          return f[k] || ''
        }))
      })
      hoja.getRow(1).height = 95
      hoja.eachRow((row, n) => row.eachCell({ includeEmpty: true }, (cell, c) => {
        cell.alignment = { vertical: 'middle', wrapText: true }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDCE6F1' } } }
        if (n === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: n % 2 === 0 ? 'FFEAF2F8' : 'FFFFFFFF' } }
          const tipo = columnas[c - 1][2]
          if (tipo === 'date') cell.numFmt = 'dd/mm/yyyy'
          if (tipo === 'money' || tipo === 'total') cell.numFmt = '"Q" #,##0.00'
        }
      }))
      const res = await window.api.donaciones.exportarExcel(await libro.xlsx.writeBuffer(), `donaciones_${new Date().toISOString().slice(0, 10)}.xlsx`)
      if (!res.ok) throw new Error(res.error)
      if (!res.data?.cancelado) mostrarToast('Excel exportado correctamente')
    } catch (err) { mostrarToast(err.message, 'error') }
    finally { setOcupado(false) }
  }

  const valor = (f, k, tipo) => k === 'monto_total' ? `Q ${formatearNumero(total(f))}` : tipo === 'date' ? (f[k] ? formatearFecha(f[k]) : '—') : (f[k] ?? '—')

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3">
      <h1 className="text-2xl font-bold">Expedientes de donación</h1>
      <div className="grid w-full gap-2 sm:flex sm:w-auto">
        <button className="btn btn-outline btn-secondary w-full sm:w-auto" disabled={ocupado || !filtradas.length} onClick={exportar}>Exportar Excel</button>
        <button className="btn btn-outline btn-primary w-full sm:w-auto" onClick={() => setForm(inicial())}>Registrar donación</button>
      </div>
    </div>
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="form-control min-w-0"><span className="label-text">Buscar</span><input className="input input-bordered input-sm w-full" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Expediente, descripción, UCNI…" /></label>
      <div className="form-control w-full sm:w-64"><span className="label-text">Donante</span><SelectBuscador size="sm" opciones={opcionesDonantes} valor={donante} onChange={setDonante} placeholder="Todos los donantes" /></div>
      <label className="form-control min-w-0"><span className="label-text">Entrega desde</span><input className="input input-bordered input-sm w-full" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} /></label>
      <label className="form-control min-w-0"><span className="label-text">Entrega hasta</span><input className="input input-bordered input-sm w-full" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} /></label>
      <button className="btn btn-ghost btn-sm w-full lg:w-auto" onClick={() => { setBusqueda(''); setDonante(''); setDesde(''); setHasta('') }}>Limpiar filtros</button>
      <span className="text-sm opacity-60">{filtradas.length} de {filas.length} donaciones</span>
    </div>
    <div className="rounded-box bg-base-100 p-4 shadow-sm overflow-auto">
      {cargando ? <span className="loading loading-spinner" /> : <table className="table table-sm table-zebra">
        <thead><tr>{['No.', 'No. de expediente', 'ONG donante', 'Descripción de la donación', 'Cantidad', 'Monto total en Q', 'Fecha de entrega', 'Acciones'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{!filtradas.length && <tr><td colSpan={8} className="text-center py-8 opacity-60">Sin donaciones para estos filtros.</td></tr>}{filtradas.map((f, i) => <tr key={f.id_expediente}>
          <td>{i + 1}</td><td>{f.no_expediente || '—'}</td><td>{f.nombre_ong}</td><td>{f.descripcion_completa}</td><td>{f.cantidad}</td><td>{formatearNumero(total(f))}</td><td>{f.fecha_entrega ? formatearFecha(f.fecha_entrega) : '—'}</td>
          <td><div className="flex gap-1"><button className="btn btn-outline btn-info btn-xs" onClick={() => setDetalle(f)}>Ver</button><button className="btn btn-outline btn-neutral btn-xs" onClick={() => setForm({ ...inicial(), ...f })}>Editar</button><button className="btn btn-outline btn-error btn-xs" onClick={() => setEliminando(f)}>Eliminar</button></div></td>
        </tr>)}</tbody>
      </table>}
    </div>
    {form && <Modal><div className="modal-box w-full max-w-5xl max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">{form.id_expediente ? 'Editar' : 'Registrar'} donación</h3>
      <form onSubmit={guardar}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPOS_DONACION.map(([k, etiqueta, tipo]) => <div className="form-control" key={k}>
            <label className="label-text mb-1" htmlFor={`donacion-${k}`}>{etiqueta}{['nombre_ong', 'descripcion_completa', 'cantidad', 'precio_unitario'].includes(k) ? ' *' : ''}</label>
            {tipo === 'donante' ? <>
              <input id={`donacion-${k}`} className="input input-bordered w-full" list="ong-donantes" autoComplete="off" required value={form.nombre_ong || ''} onChange={(e) => setForm((f) => ({ ...f, nombre_ong: e.target.value }))} placeholder="Busque una ONG o escriba un nombre nuevo" />
              <datalist id="ong-donantes">{ongs.map((o) => <option key={o.id_ong} value={o.nombre} />)}</datalist>
              <span className="label-text-alt mt-1 opacity-60">{form.nombre_ong?.trim() ? ongs.some((o) => normalizar(o.nombre) === normalizar(form.nombre_ong)) ? 'Se utilizará la ONG existente.' : 'Se creará esta ONG al guardar la donación.' : 'Seleccione una coincidencia o ingrese únicamente el nombre de la nueva ONG.'}</span>
            </> :
              <input id={`donacion-${k}`} className="input input-bordered w-full" type={tipo === 'date' ? 'date' : ['number', 'money', 'total'].includes(tipo) ? 'number' : 'text'} step={tipo === 'money' || tipo === 'total' ? '0.01' : undefined} min={k === 'cantidad' ? 1 : ['money', 'total', 'number'].includes(tipo) ? 0 : undefined} required={['descripcion_completa', 'cantidad', 'precio_unitario'].includes(k)} readOnly={tipo === 'total'} value={tipo === 'total' ? total(form).toFixed(2) : form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />}
          </div>)}
        </div>
         <div className="modal-action flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button className="btn btn-outline btn-neutral w-full sm:w-auto" type="button" disabled={ocupado} onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-outline btn-primary w-full sm:w-auto" disabled={ocupado}>Guardar donación</button></div>
      </form>
    </div></Modal>}
    {detalle && <Modal><div className="modal-box max-w-3xl"><h3 className="text-lg font-bold">Detalle de la donación</h3><table className="table table-sm"><tbody>{CAMPOS_DONACION.map(([k, etiqueta, tipo]) => <tr key={k}><td className="opacity-60">{etiqueta}</td><td>{valor(detalle, k, tipo) || '—'}</td></tr>)}</tbody></table><div className="modal-action"><button className="btn" onClick={() => setDetalle(null)}>Cerrar</button></div></div></Modal>}
    {eliminando && <Modal><div className="modal-box"><h3 className="text-lg font-bold">Eliminar donación</h3><p className="py-4">¿Eliminar la donación {eliminando.no_expediente || eliminando.id_expediente} de {eliminando.nombre_ong}?</p><div className="modal-action"><button className="btn" disabled={ocupado} onClick={() => setEliminando(null)}>Cancelar</button><button className="btn btn-error" disabled={ocupado} onClick={eliminar}>Eliminar</button></div></div></Modal>}
    <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
  </div>
}
