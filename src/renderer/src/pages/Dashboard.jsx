import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import SelectBuscador from '../components/SelectBuscador.jsx'
import { useToast } from '../lib/useToast.js'
import { formatearFecha, formatearNumero } from '../lib/util.js'

const FORM_INICIAL = {
  id_suministro: '',
  id_entidad: '',
  numero_lote: '',
  fecha_vencimiento: '',
  precio_unitario: '',
  cantidad: '',
  tipo_movimiento: 'Entrada_Compra',
  documento_referencia: ''
}

export default function Dashboard() {
  const [saldo, setSaldo] = useState([])
  const [proximos, setProximos] = useState([])
  const [suministros, setSuministros] = useState([])
  const [entidades, setEntidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [toast, mostrarToast, cerrarToast] = useToast()

  const cargar = async () => {
    const [resSaldo, resProximos, resSuministros, resEntidades] = await Promise.all([
      window.api.inventario.saldo(),
      window.api.inventario.proximosVencer(90),
      window.api.suministros.listar(),
      window.api.entidades.listar()
    ])
    if (resSaldo.ok) setSaldo(resSaldo.data)
    if (resProximos.ok) setProximos(resProximos.data)
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
    setEnviando(true)
    try {
      const payload = {
        id_suministro: Number(form.id_suministro),
        id_entidad: Number(form.id_entidad),
        numero_lote: form.numero_lote,
        fecha_vencimiento: form.fecha_vencimiento,
        precio_unitario: Number(form.precio_unitario),
        cantidad: Number(form.cantidad),
        tipo_movimiento: form.tipo_movimiento,
        documento_referencia: form.documento_referencia || undefined
      }

      const res = await window.api.kardex.registrarEntrada(payload)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Entrada registrada correctamente')
      setModalAbierto(false)
      setForm(FORM_INICIAL)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  const totalUnidades = saldo.reduce((acc, s) => acc + (s.saldo_total || 0), 0)
  const criticos = proximos.filter((p) => p.dias_restantes <= 30)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
          <Icon name="kardex" className="h-4 w-4" />
          Registrar entrada
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat rounded-box bg-base-200 shadow-sm">
          <div className="stat-title">Suministros catalogados</div>
          <div className="stat-value">{formatearNumero(saldo.length)}</div>
          <div className="stat-desc">productos en el catálogo</div>
        </div>
        <div className="stat rounded-box bg-base-200 shadow-sm">
          <div className="stat-title">Unidades en stock</div>
          <div className="stat-value">{formatearNumero(totalUnidades)}</div>
          <div className="stat-desc">saldo físico dinámico</div>
        </div>
        <div className="stat rounded-box bg-base-200 shadow-sm">
          <div className="stat-title">Lotes por vencer (90 días)</div>
          <div className="stat-value text-warning">{formatearNumero(proximos.length)}</div>
          <div className="stat-desc">requieren seguimiento</div>
        </div>
        <div className="stat rounded-box bg-base-200 shadow-sm">
          <div className="stat-title">Críticos (≤ 30 días)</div>
          <div className="stat-value text-error">{formatearNumero(criticos.length)}</div>
          <div className="stat-desc">próximos a expirar</div>
        </div>
      </div>

      <div className="rounded-box bg-base-100 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-semibold">Inventario actual</h2>
        </div>
        <div className="p-4">
          {cargando ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th className="text-right">Saldo total</th>
                    <th className="text-right">Lotes</th>
                  </tr>
                </thead>
                <tbody>
                  {saldo.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center opacity-60">
                        Sin datos de inventario.
                      </td>
                    </tr>
                  )}
                  {saldo.map((s) => (
                    <tr key={s.id_suministro}>
                      <td className="font-mono">{s.codigo_producto}</td>
                      <td>{s.descripcion_completa}</td>
                      <td className="opacity-70">{s.cantidad_unitaria}</td>
                      <td className="text-right font-semibold">
                        <span className={s.saldo_total <= 0 ? 'text-error' : ''}>
                          {formatearNumero(s.saldo_total)}
                        </span>
                      </td>
                      <td className="text-right">{formatearNumero(s.total_lotes)}</td>
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
          <div className="modal-box max-w-2xl">
            <h3 className="text-lg font-bold">Registrar entrada</h3>
            <form onSubmit={enviarEntrada} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="label-text">Tipo de movimiento</span>
                  <select
                    className="select select-bordered"
                    value={form.tipo_movimiento}
                    onChange={(e) => cambiar('tipo_movimiento', e.target.value)}
                    required
                  >
                    <option value="Entrada_Compra">Entrada por compra</option>
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Suministro</span>
                  <SelectBuscador 
                    opciones={suministros.map(s => ({ value: s.id_suministro, label: `${s.codigo_producto} — ${s.descripcion_completa}` }))}
                    valor={form.id_suministro}
                    onChange={(val) => cambiar('id_suministro', val)}
                    placeholder="Seleccione un suministro..."
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Entidad</span>
                  <SelectBuscador 
                    opciones={entidades.map(e => ({ value: e.id_entidad, label: e.nombre_razon_social }))}
                    valor={form.id_entidad}
                    onChange={(val) => cambiar('id_entidad', val)}
                    placeholder="Seleccione una entidad..."
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Número de lote</span>
                  <input
                    className="input input-bordered"
                    value={form.numero_lote}
                    onChange={(e) => cambiar('numero_lote', e.target.value)}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Fecha de vencimiento</span>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={form.fecha_vencimiento}
                    onChange={(e) => cambiar('fecha_vencimiento', e.target.value)}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Precio unitario</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered"
                    value={form.precio_unitario}
                    onChange={(e) => cambiar('precio_unitario', e.target.value)}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Cantidad</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="input input-bordered"
                    value={form.cantidad}
                    onChange={(e) => cambiar('cantidad', e.target.value)}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Documento de referencia</span>
                  <input
                    className="input input-bordered"
                    value={form.documento_referencia}
                    onChange={(e) => cambiar('documento_referencia', e.target.value)}
                  />
                </label>
              </div>

              {/* El módulo UCNI se movió a la pantalla de Donaciones */}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  Guardar
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
