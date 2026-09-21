import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { formatearFecha, formatearFechaHora, formatearNumero } from '../lib/util.js'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import SelectBuscador from '../components/SelectBuscador.jsx'
import { useToast } from '../lib/useToast.js'

const FORM_INICIAL = {
  id_suministro: '',
  id_entidad: '',
  numero_lote: '',
  fecha_vencimiento: '',
  precio_unitario: '',
  cantidad: '',
  tipo_movimiento: 'Entrada_Donacion',
  documento_referencia: '',

  ano_donacion: new Date().getFullYear(),
  no_expediente: '',
  tipo_donacion: '',
  no_caso_ucni: '',
  numero_siges: '',
  nombre_licenciado_ucni: '',
  no_carta_intencion: '',
  fecha_carta_intencion: '',
  dictamen_tecnico: '',
  fecha_dictamen_tecnico: '',
  no_carta_agradecimiento: '',
  fecha_carta_agradecimiento: '',
  no_acta_administrativa: '',
  fecha_suscripcion_acta: '',
  no_ingreso_almacen: '',
  anexo_utilizado: '',
  no_oficio_entrega: '',
  no_acuerdo_ministerial: '',
  fecha_aprobacion_acuerdo: '',
  codigo_siges: '',
  codigo_sicoin: '',
  cur: ''
}

const TABS = [
  'General',
  'UCNI',
  'Técnico y Resoluciones',
  'Actas y Almacén',
  'Acuerdos y Financiero'
]

const EXPORTAR_COLUMNAS = [
  'No.',
  'AÑO DE LA DONACIÓN',
  'No. DE EXPEDIENTE',
  'ONG DONANTE',
  'TIPO DE DONACIÓN',
  'DESCRIPCIÓN DE LA DONACIÓN',
  'CANTIDAD',
  'VALOR UNITARIO EN Q',
  'MONTO TOTAL EN Q',
  'No. DE CASO EN UNIDAD DE COOPERACIÓN NACIONAL E INTERNACIONAL (UCNI)',
  'NÚMERO DE SIAD',
  'NOMBRE DEL LICENCIADO (A) QUE LLEVA EL CASO EN UCNI',
  'No. DE CARTA DE INTENCIÓN DE DONACIÓN',
  'FECHA DE LA CARTA DE INTENCIÓN DE DONACIÓN',
  'DICTAMEN TÉCNICO NÚMERO',
  'FECHA DEL DICTAMEN TÉCNICO',
  'NÚMERO DE LA CARTA DE AGRADECIMIENTO DEL MINISTRO',
  'FECHA DE LA CARTA DE AGRADECIMIENTO DEL MINISTRO',
  'No. DE ACTA ADMINISTRATIVA',
  'FECHA DE SUSCRIPCIÓN DEL ACTA',
  'No. DE INGRESO A ALMACÉN 1-H',
  'ANEXO UTILIZADO',
  'No. DE OFICIO DE ENTREGA DEL EXPEDIENTE DE DONACIÓN',
  'No. DE ACUERDO MINISTERIAL',
  'FECHA DE APROBACIÓN DEL ACUERDO MINISTERIAL',
  'CODIGO SIGES',
  'CODIGO SICOIN',
  'CODIGO ÚNICO DE REGISTRO (CUR)'
]

export default function Donaciones() {
  const [filas, setFilas] = useState([])
  const [suministros, setSuministros] = useState([])
  const [entidades, setEntidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [tabActivo, setTabActivo] = useState(0)
  const [toast, mostrarToast, cerrarToast] = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [exportando, setExportando] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const abrirEdicion = async (id) => {
    setEnviando(true)
    let res
    try {
      res = await window.api.donaciones.obtener(id)
    } catch {
      res = { ok: false, error: 'No se pudo conectar con el proceso principal. Reinicie la aplicación.' }
    }
    setEnviando(false)
    if (!res.ok || !res.data) {
      mostrarToast(res.error || 'No se pudo cargar el expediente', 'error')
      return
    }
    const f = res.data
    setEditando(f)
    setForm({
      id_suministro: f.id_suministro ?? '',
      id_entidad: f.id_entidad ?? '',
      numero_lote: f.numero_lote ?? '',
      fecha_vencimiento: f.fecha_vencimiento ?? '',
      precio_unitario: f.precio_unitario ?? '',
      cantidad: f.cantidad ?? '',
      tipo_movimiento: 'Entrada_Donacion',
      documento_referencia: f.documento_referencia ?? '',

      ano_donacion: f.ano_donacion ?? new Date().getFullYear(),
      no_expediente: f.no_expediente ?? '',
      tipo_donacion: f.tipo_donacion ?? '',
      no_caso_ucni: f.no_caso_ucni ?? '',
      numero_siges: f.numero_siges ?? '',
      nombre_licenciado_ucni: f.nombre_licenciado_ucni ?? '',
      no_carta_intencion: f.no_carta_intencion ?? '',
      fecha_carta_intencion: f.fecha_carta_intencion ?? '',
      dictamen_tecnico: f.dictamen_tecnico ?? '',
      fecha_dictamen_tecnico: f.fecha_dictamen_tecnico ?? '',
      no_carta_agradecimiento: f.no_carta_agradecimiento ?? '',
      fecha_carta_agradecimiento: f.fecha_carta_agradecimiento ?? '',
      no_acta_administrativa: f.no_acta_administrativa ?? '',
      fecha_suscripcion_acta: f.fecha_suscripcion_acta ?? '',
      no_ingreso_almacen: f.no_ingreso_almacen ?? '',
      anexo_utilizado: f.anexo_utilizado ?? '',
      no_oficio_entrega: f.no_oficio_entrega ?? '',
      no_acuerdo_ministerial: f.no_acuerdo_ministerial ?? '',
      fecha_aprobacion_acuerdo: f.fecha_aprobacion_acuerdo ?? '',
      codigo_siges: f.codigo_siges ?? '',
      codigo_sicoin: f.codigo_sicoin ?? '',
      cur: f.cur ?? ''
    })
    setTabActivo(0)
    setModalAbierto(true)
  }

  const confirmarEliminar = async () => {
    setEnviando(true)
    try {
      const res = await window.api.donaciones.eliminar(eliminando.id_expediente)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
      } else {
        mostrarToast('Expediente eliminado correctamente')
      }
      setEliminando(null)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  const exportarExcel = async () => {
    if (filasFiltradas.length === 0) {
      mostrarToast('No hay expedientes que exportar', 'error')
      return
    }

    setExportando(true)
    try {
      const filas = filasFiltradas.map((f, i) => [
        i + 1,
        f.ano_donacion || '',
        f.no_expediente || '',
        f.nombre_razon_social || '',
        f.tipo_donacion || '',
        f.descripcion_completa || '',
        f.cantidad,
        f.precio_unitario,
        f.cantidad * (f.precio_unitario || 0),
        f.no_caso_ucni || '',
        f.numero_siges || '',
        f.nombre_licenciado_ucni || '',
        f.no_carta_intencion || '',
        f.fecha_carta_intencion ? formatearFecha(f.fecha_carta_intencion) : '',
        f.dictamen_tecnico || '',
        f.fecha_dictamen_tecnico ? formatearFecha(f.fecha_dictamen_tecnico) : '',
        f.no_carta_agradecimiento || '',
        f.fecha_carta_agradecimiento ? formatearFecha(f.fecha_carta_agradecimiento) : '',
        f.no_acta_administrativa || '',
        f.fecha_suscripcion_acta ? formatearFecha(f.fecha_suscripcion_acta) : '',
        f.no_ingreso_almacen || '',
        f.anexo_utilizado || '',
        f.no_oficio_entrega || '',
        f.no_acuerdo_ministerial || '',
        f.fecha_aprobacion_acuerdo ? formatearFecha(f.fecha_aprobacion_acuerdo) : '',
        f.codigo_siges || '',
        f.codigo_sicoin || '',
        f.cur || ''
      ])

      const hoja = XLSX.utils.aoa_to_sheet([EXPORTAR_COLUMNAS, ...filas])
      hoja['!cols'] = EXPORTAR_COLUMNAS.map((c) => ({ wch: Math.min(Math.max(c.length + 2, 14), 50) }))
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Donaciones')
      const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })

      const fecha = new Date().toISOString().slice(0, 10)
      const res = await window.api.donaciones.exportarExcel(buffer, `donaciones_${fecha}.xlsx`)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      if (res.data?.cancelado) return
      mostrarToast(`Exportado: ${res.data.ruta}`)
    } finally {
      setExportando(false)
    }
  }

  const filasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const desde = fechaDesde ? fechaDesde.slice(0, 10) : ''
    const hasta = fechaHasta ? fechaHasta.slice(0, 10) : ''

    return filas.filter((f) => {
      if (desde || hasta) {
        const fecha = String(f.fecha_movimiento || '').slice(0, 10)
        if (desde && fecha < desde) return false
        if (hasta && fecha > hasta) return false
      }
      if (!termino) return true

      const campos = [
        f.numero_kardex,
        f.ano_donacion,
        f.no_expediente,
        f.nombre_razon_social,
        f.codigo_producto,
        f.descripcion_completa,
        f.no_caso_ucni,
        f.dictamen_tecnico,
        f.no_ingreso_almacen,
        f.no_acuerdo_ministerial,
        f.numero_siges,
        f.cur
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return campos.includes(termino)
    })
  }, [filas, busqueda, fechaDesde, fechaHasta])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
    setForm(FORM_INICIAL)
    setTabActivo(0)
  }

  const abrirNueva = () => {
    setEditando(null)
    setForm(FORM_INICIAL)
    setTabActivo(0)
    setModalAbierto(true)
  }

  const cargar = async () => {
    const [resDonaciones, resSuministros, resEntidades] = await Promise.all([
      window.api.donaciones.listar(),
      window.api.suministros.listar(),
      window.api.entidades.listar()
    ])
    if (resDonaciones.ok) setFilas(resDonaciones.data)
    if (resSuministros.ok) setSuministros(resSuministros.data)
    if (resEntidades.ok) setEntidades(resEntidades.data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const enviarEntrada = async (e) => {
    e.preventDefault()

    if (tabActivo < TABS.length - 1) {
      setTabActivo(t => t + 1)
      return
    }

    setEnviando(true)
    try {
      const payload = {
        id_suministro: form.id_suministro ? Number(form.id_suministro) : null,
        id_entidad: form.id_entidad ? Number(form.id_entidad) : null,
        numero_lote: form.numero_lote,
        fecha_vencimiento: form.fecha_vencimiento,
        precio_unitario: Number(form.precio_unitario),
        cantidad: Number(form.cantidad),
        tipo_movimiento: form.tipo_movimiento,
        documento_referencia: form.documento_referencia || undefined,
        expediente: { ...form }
      }

      const res = editando
        ? await window.api.donaciones.actualizar(editando.id_expediente, payload)
        : await window.api.kardex.registrarEntrada(payload)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast(editando ? 'Donación actualizada correctamente' : 'Donación registrada correctamente')
      setModalAbierto(false)
      setEditando(null)
      setForm(FORM_INICIAL)
      setTabActivo(0)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Expedientes de donación</h1>
        <div className="flex gap-2">
          <button className="btn btn-success btn-outline" onClick={exportarExcel} disabled={exportando}>
            {exportando ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Icon name="descargar" className="h-4 w-4" />
            )}
            Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={abrirNueva}>
            <Icon name="donaciones" className="h-4 w-4" />
            Registrar donación
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control w-full max-w-xs">
          <span className="label-text">Buscar</span>
          <input
            type="search"
            className="input input-bordered input-sm"
            placeholder="Expediente, ONG, producto, UCNI…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text">Desde</span>
          <input
            type="date"
            className="input input-bordered input-sm w-40"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text">Hasta</span>
          <input
            type="date"
            className="input input-bordered input-sm w-40"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </label>
        {(busqueda || fechaDesde || fechaHasta) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpiarFiltros}>
            Limpiar
          </button>
        )}
        <span className="text-sm opacity-60 pb-1">
          {filasFiltradas.length} de {filas.length} expediente(s)
        </span>
      </div>

      <div className="rounded-box bg-base-100 shadow-sm">
        <div className="p-4">
          {cargando ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
              <table className="table table-sm table-zebra whitespace-nowrap">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>No.</th>
                    <th>Fecha</th>
                    <th>Año</th>
                    <th>No. Expediente</th>
                    <th>ONG Donante</th>
                    <th>Producto</th>
                    <th className="text-right">Cantidad</th>
                    <th>No. Caso UCNI</th>
                    <th>Dictamen Técnico</th>
                    <th>No. Ingreso Almacén</th>
                    <th>Acuerdo Min.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center opacity-60 py-8">
                        Sin expedientes de donación.
                      </td>
                    </tr>
                  )}
                  {filasFiltradas.map((f) => (
                    <tr key={f.id_expediente}>
                      <td className="font-mono text-xs opacity-70">{f.numero_kardex}</td>
                      <td className="whitespace-nowrap">{formatearFecha(f.fecha_movimiento)}</td>
                      <td>{f.ano_donacion || '—'}</td>
                      <td className="font-mono">{f.no_expediente || '—'}</td>
                      <td>{f.nombre_razon_social}</td>
                      <td>
                        <div className="font-mono text-xs opacity-70">{f.codigo_producto}</div>
                        <div>{f.descripcion_completa}</div>
                      </td>
                      <td className="text-right text-success font-semibold">+{formatearNumero(f.cantidad)}</td>
                      <td className="font-mono">{f.no_caso_ucni || '—'}</td>
                      <td className="font-mono">{f.dictamen_tecnico || '—'}</td>
                      <td className="font-mono">{f.no_ingreso_almacen || '—'}</td>
                      <td className="font-mono text-xs">{f.no_acuerdo_ministerial || '—'}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setDetalle(f)}
                            title="Ver detalle"
                          >
                            <Icon name="ojo" className="h-4 w-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-info"
                            onClick={() => abrirEdicion(f.id_expediente)}
                            title="Editar"
                          >
                            <Icon name="lápiz" className="h-4 w-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => setEliminando(f)}
                            title="Eliminar"
                          >
                            <Icon name="basura" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold">{editando ? `Editar donación (Paso ${tabActivo + 1} de ${TABS.length})` : `Registrar donación (Paso ${tabActivo + 1} de ${TABS.length})`}</h3>

            <div role="tablist" className="tabs tabs-bordered my-4">
              {TABS.map((t, idx) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  className={`tab ${tabActivo === idx ? 'tab-active font-semibold' : ''}`}
                  onClick={() => setTabActivo(idx)}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={enviarEntrada} className="flex-1 overflow-y-auto pr-2 pb-4 space-y-4">
              {tabActivo === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text">Año de la donación</span>
                    <input type="number" className="input input-bordered" value={form.ano_donacion} onChange={(e) => cambiar('ano_donacion', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Tipo de donación</span>
                    <input className="input input-bordered" value={form.tipo_donacion} onChange={(e) => cambiar('tipo_donacion', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Suministro <span className="text-error">*</span></span>
                    <SelectBuscador 
                      opciones={suministros.map(s => ({ value: s.id_suministro, label: `${s.codigo_producto} — ${s.descripcion_completa}` }))}
                      valor={form.id_suministro}
                      onChange={(val) => cambiar('id_suministro', val)}
                      placeholder="Seleccione un suministro..."
                    />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">ONG Donante <span className="text-error">*</span></span>
                    <SelectBuscador 
                      opciones={entidades.map(e => ({ value: e.id_entidad, label: e.nombre_razon_social }))}
                      valor={form.id_entidad}
                      onChange={(val) => cambiar('id_entidad', val)}
                      placeholder="Seleccione una ONG..."
                    />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Número de lote <span className="text-error">*</span></span>
                    <input className="input input-bordered" value={form.numero_lote} onChange={(e) => cambiar('numero_lote', e.target.value)} required />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha de vencimiento <span className="text-error">*</span></span>
                    <input type="date" className="input input-bordered" value={form.fecha_vencimiento} onChange={(e) => cambiar('fecha_vencimiento', e.target.value)} required />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Cantidad <span className="text-error">*</span></span>
                    <input type="number" min="1" className="input input-bordered" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} required />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Valor unitario en Q <span className="text-error">*</span></span>
                    <input type="number" step="0.01" min="0" className="input input-bordered" value={form.precio_unitario} onChange={(e) => cambiar('precio_unitario', e.target.value)} required />
                  </label>
                </div>
              )}

              {tabActivo === 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text">No. de Expediente (General)</span>
                    <input className="input input-bordered" value={form.no_expediente} onChange={(e) => cambiar('no_expediente', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">No. Caso en UCNI</span>
                    <input className="input input-bordered" value={form.no_caso_ucni} onChange={(e) => cambiar('no_caso_ucni', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Licenciado(a) UCNI</span>
                    <input className="input input-bordered" value={form.nombre_licenciado_ucni} onChange={(e) => cambiar('nombre_licenciado_ucni', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">No. Carta Intención</span>
                    <input className="input input-bordered" value={form.no_carta_intencion} onChange={(e) => cambiar('no_carta_intencion', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha Carta Intención</span>
                    <input type="date" className="input input-bordered" value={form.fecha_carta_intencion} onChange={(e) => cambiar('fecha_carta_intencion', e.target.value)} />
                  </label>
                </div>
              )}

              {tabActivo === 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text">Dictamen Técnico Número</span>
                    <input className="input input-bordered" value={form.dictamen_tecnico} onChange={(e) => cambiar('dictamen_tecnico', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha Dictamen Técnico</span>
                    <input type="date" className="input input-bordered" value={form.fecha_dictamen_tecnico} onChange={(e) => cambiar('fecha_dictamen_tecnico', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">No. Carta Agradecimiento M.</span>
                    <input className="input input-bordered" value={form.no_carta_agradecimiento} onChange={(e) => cambiar('no_carta_agradecimiento', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha Carta Agradecimiento M.</span>
                    <input type="date" className="input input-bordered" value={form.fecha_carta_agradecimiento} onChange={(e) => cambiar('fecha_carta_agradecimiento', e.target.value)} />
                  </label>
                </div>
              )}

              {tabActivo === 3 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text">No. Acta Administrativa</span>
                    <input className="input input-bordered" value={form.no_acta_administrativa} onChange={(e) => cambiar('no_acta_administrativa', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha Suscripción Acta</span>
                    <input type="date" className="input input-bordered" value={form.fecha_suscripcion_acta} onChange={(e) => cambiar('fecha_suscripcion_acta', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">No. Ingreso Almacén (14-H)</span>
                    <input className="input input-bordered" value={form.no_ingreso_almacen} onChange={(e) => cambiar('no_ingreso_almacen', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Anexo Utilizado</span>
                    <input className="input input-bordered" value={form.anexo_utilizado} onChange={(e) => cambiar('anexo_utilizado', e.target.value)} />
                  </label>
                  <label className="form-control w-full sm:col-span-2">
                    <span className="label-text">No. Oficio Entrega Expediente</span>
                    <input className="input input-bordered" value={form.no_oficio_entrega} onChange={(e) => cambiar('no_oficio_entrega', e.target.value)} />
                  </label>
                </div>
              )}

              {tabActivo === 4 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text">No. Acuerdo Ministerial</span>
                    <input className="input input-bordered" value={form.no_acuerdo_ministerial} onChange={(e) => cambiar('no_acuerdo_ministerial', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Fecha Aprobación Acuerdo</span>
                    <input type="date" className="input input-bordered" value={form.fecha_aprobacion_acuerdo} onChange={(e) => cambiar('fecha_aprobacion_acuerdo', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Número de SIGES</span>
                    <input className="input input-bordered" value={form.numero_siges} onChange={(e) => cambiar('numero_siges', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Código SIGES</span>
                    <input className="input input-bordered" value={form.codigo_siges} onChange={(e) => cambiar('codigo_siges', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">Código SICOIN</span>
                    <input className="input input-bordered" value={form.codigo_sicoin} onChange={(e) => cambiar('codigo_sicoin', e.target.value)} />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text">C.U.R. (Código Único Registro)</span>
                    <input className="input input-bordered" value={form.cur} onChange={(e) => cambiar('cur', e.target.value)} />
                  </label>
                </div>
              )}

              <div className="modal-action pt-4 sticky bottom-0 bg-base-100 border-t border-base-200">
                {tabActivo > 0 ? (
                  <button type="button" className="btn mr-auto" onClick={() => setTabActivo(t => t - 1)}>
                    Anterior
                  </button>
                ) : (
                  <div className="mr-auto" />
                )}

                <button type="button" className="btn btn-ghost" onClick={cerrarModal}>
                  Cancelar
                </button>

                <button 
                  type="button" 
                  className={`btn btn-neutral ${tabActivo < TABS.length - 1 ? '' : 'hidden'}`} 
                  onClick={(e) => { e.preventDefault(); setTabActivo(t => t + 1) }}
                >
                  Siguiente
                </button>
                
                <button 
                  type="submit" 
                  className={`btn btn-primary ${tabActivo === TABS.length - 1 ? '' : 'hidden'}`} 
                  disabled={enviando}
                >
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  {editando ? 'Guardar cambios' : 'Guardar donación'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cerrarModal}>cerrar</button>
          </form>
        </dialog>
      )}

      {detalle && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold">Detalle del expediente</h3>
            <div className="mt-4 mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-70">
              <span>Kardex: <strong className="font-mono">{detalle.numero_kardex}</strong></span>
              <span>Fecha: <strong>{formatearFecha(detalle.fecha_movimiento)}</strong></span>
              <span>ONG: <strong>{detalle.nombre_razon_social}</strong></span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <table className="table table-sm">
                <tbody>
                  {[
                    ['Año de la donación', detalle.ano_donacion],
                    ['No. de expediente', detalle.no_expediente],
                    ['Tipo de donación', detalle.tipo_donacion],
                    ['Suministro', detalle.descripcion_completa],
                    ['Código de producto', detalle.codigo_producto],
                    ['Lote', detalle.numero_lote],
                    ['Fecha de vencimiento', detalle.fecha_vencimiento ? formatearFecha(detalle.fecha_vencimiento) : '—'],
                    ['Cantidad', detalle.cantidad],
                    ['Valor unitario (Q)', detalle.precio_unitario],
                    ['No. caso UCNI', detalle.no_caso_ucni],
                    ['Número de SIGES', detalle.numero_siges],
                    ['Licenciado(a) UCNI', detalle.nombre_licenciado_ucni],
                    ['Carta de intención', detalle.no_carta_intencion],
                    ['Fecha carta de intención', detalle.fecha_carta_intencion ? formatearFecha(detalle.fecha_carta_intencion) : '—'],
                    ['Dictamen técnico', detalle.dictamen_tecnico],
                    ['Fecha dictamen técnico', detalle.fecha_dictamen_tecnico ? formatearFecha(detalle.fecha_dictamen_tecnico) : '—'],
                    ['Carta agradecimiento M.', detalle.no_carta_agradecimiento],
                    ['Fecha carta agradecimiento', detalle.fecha_carta_agradecimiento ? formatearFecha(detalle.fecha_carta_agradecimiento) : '—'],
                    ['No. acta administrativa', detalle.no_acta_administrativa],
                    ['Fecha suscripción acta', detalle.fecha_suscripcion_acta ? formatearFecha(detalle.fecha_suscripcion_acta) : '—'],
                    ['No. ingreso almacén', detalle.no_ingreso_almacen],
                    ['Anexo utilizado', detalle.anexo_utilizado],
                    ['Oficio de entrega', detalle.no_oficio_entrega],
                    ['Acuerdo ministerial', detalle.no_acuerdo_ministerial],
                    ['Fecha aprobación acuerdo', detalle.fecha_aprobacion_acuerdo ? formatearFecha(detalle.fecha_aprobacion_acuerdo) : '—'],
                    ['Código SIGES', detalle.codigo_siges],
                    ['Código SICOIN', detalle.codigo_sicoin],
                    ['CUR', detalle.cur]
                  ].map(([etiqueta, valor]) => (
                    <tr key={etiqueta}>
                      <td className="opacity-60 w-1/2">{etiqueta}</td>
                      <td>{(valor === null || valor === '' || valor === undefined) ? '—' : valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => { abrirEdicion(detalle.id_expediente); setDetalle(null) }}>
                Editar
              </button>
              <button className="btn btn-ghost" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDetalle(null)}>cerrar</button>
          </form>
        </dialog>
      )}

      {eliminando && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Confirmar eliminación</h3>
            <p className="py-4">
              ¿Eliminar el expediente de donación <strong>{eliminando.no_expediente || eliminando.numero_kardex}</strong> de{' '}
              <strong>{eliminando.nombre_razon_social}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEliminando(null)}>
                Cancelar
              </button>
              <button className="btn btn-error" onClick={confirmarEliminar} disabled={enviando}>
                {enviando && <span className="loading loading-spinner loading-sm" />}
                Eliminar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEliminando(null)}>cerrar</button>
          </form>
        </dialog>
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}

