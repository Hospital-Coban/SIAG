import { useEffect, useMemo, useState } from 'react'
import { formatearFechaHora, formatearNumero } from '../lib/util.js'
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

      const res = await window.api.kardex.registrarEntrada(payload)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Donación registrada correctamente')
      setModalAbierto(false)
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
        <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
          <Icon name="donaciones" className="h-4 w-4" />
          Registrar donación
        </button>
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
                    <th>Año</th>
                    <th>No. Expediente</th>
                    <th>ONG Donante</th>
                    <th>Producto</th>
                    <th className="text-right">Cantidad</th>
                    <th>No. Caso UCNI</th>
                    <th>Dictamen Técnico</th>
                    <th>No. Ingreso Almacén</th>
                    <th>Acuerdo Min.</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center opacity-60 py-8">
                        Sin expedientes de donación.
                      </td>
                    </tr>
                  )}
                  {filas.map((f) => (
                    <tr key={f.id_expediente}>
                      <td className="font-mono text-xs opacity-70">{f.numero_kardex}</td>
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
            <h3 className="text-lg font-bold">Registrar donación (Paso {tabActivo + 1} de {TABS.length})</h3>

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

                <button type="button" className="btn btn-ghost" onClick={() => setModalAbierto(false)}>
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
                  Guardar donación
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModalAbierto(false)}>cerrar</button>
          </form>
        </dialog>
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
