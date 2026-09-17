import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'
import { formatearFechaHora, formatearNumero } from '../lib/util.js'

const ESTILO_TIPO = {
  Entrada_Compra: 'badge-success',
  Entrada_Donacion: 'badge-primary',
  Salida: 'badge-error',
  Reajuste: 'badge-warning'
}

export default function Kardex() {
  const [filas, setFilas] = useState([])
  const [suministros, setSuministros] = useState([])
  const [entidades, setEntidades] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [toast, mostrarToast, cerrarToast] = useToast()

  const [modalSalida, setModalSalida] = useState(false)
  const [modalReajuste, setModalReajuste] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [formSalida, setFormSalida] = useState({
    id_suministro: '',
    id_entidad: '',
    cantidad: '',
    documento_referencia: ''
  })
  const [formReajuste, setFormReajuste] = useState({
    id_suministro: '',
    id_lote: '',
    id_entidad: '',
    cantidad: '',
    documento_referencia: ''
  })
  const [lotes, setLotes] = useState([])

  const cargar = async () => {
    const [resKardex, resSum, resEnt] = await Promise.all([
      window.api.kardex.listar({ tipo_movimiento: filtroTipo || undefined }),
      window.api.suministros.listar(),
      window.api.entidades.listar()
    ])
    if (resKardex.ok) setFilas(resKardex.data)
    if (resSum.ok) setSuministros(resSum.data)
    if (resEnt.ok) setEntidades(resEnt.data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [filtroTipo])

  const cargarLotes = async (id_suministro) => {
    if (!id_suministro) {
      setLotes([])
      return
    }
    const res = await window.api.inventario.listarLotes(id_suministro)
    if (res.ok) setLotes(res.data.filter((l) => l.saldo_lote > 0))
  }

  const saldoDisponible = lotes.reduce((a, l) => a + l.saldo_lote, 0)

  const enviarSalida = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await window.api.kardex.registrarSalida({
        id_suministro: Number(formSalida.id_suministro),
        id_entidad: Number(formSalida.id_entidad),
        cantidad: Number(formSalida.cantidad),
        documento_referencia: formSalida.documento_referencia || undefined
      })
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast(`Salida registrada (PEPS) — ${res.data.numero_kardex}`)
      setModalSalida(false)
      setFormSalida({ id_suministro: '', id_entidad: '', cantidad: '', documento_referencia: '' })
      setLotes([])
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  const enviarReajuste = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await window.api.kardex.registrarReajuste({
        id_lote: Number(formReajuste.id_lote),
        id_entidad: Number(formReajuste.id_entidad),
        cantidad: Number(formReajuste.cantidad),
        documento_referencia: formReajuste.documento_referencia || undefined
      })
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Reajuste registrado correctamente')
      setModalReajuste(false)
      setFormReajuste({ id_suministro: '', id_lote: '', id_entidad: '', cantidad: '', documento_referencia: '' })
      setLotes([])
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Kardex</h1>
        <div className="flex gap-2">
          <button className="btn btn-error btn-outline" onClick={() => setModalSalida(true)}>
            Registrar salida
          </button>
          <button className="btn btn-warning btn-outline" onClick={() => setModalReajuste(true)}>
            Reajuste
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="select select-bordered select-sm"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los movimientos</option>
          <option value="Entrada_Compra">Entrada por compra</option>
          <option value="Entrada_Donacion">Entrada por donación</option>
          <option value="Salida">Salida</option>
          <option value="Reajuste">Reajuste</option>
        </select>
        <span className="text-sm opacity-60">{filas.length} movimiento(s)</span>
      </div>

      <div className="rounded-box bg-base-100 shadow-sm">
        <div className="p-4">
          {cargando ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Kardex</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Vence</th>
                    <th>Entidad</th>
                    <th>Documento</th>
                    <th className="text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center opacity-60">
                        Sin movimientos.
                      </td>
                    </tr>
                  )}
                  {filas.map((f) => (
                    <tr key={f.id_transaccion}>
                      <td className="font-mono">{f.numero_kardex}</td>
                      <td className="whitespace-nowrap">{formatearFechaHora(f.fecha_movimiento)}</td>
                      <td>
                        <span className={`badge badge-sm ${ESTILO_TIPO[f.tipo_movimiento] || ''}`}>
                          {f.tipo_movimiento.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="font-mono text-xs opacity-70">{f.codigo_producto}</div>
                        <div>{f.descripcion_completa}</div>
                      </td>
                      <td>{f.numero_lote}</td>
                      <td className="whitespace-nowrap">{formatearFechaHora(f.fecha_vencimiento)}</td>
                      <td>{f.nombre_razon_social}</td>
                      <td>{f.documento_referencia || '—'}</td>
                      <td className="text-right font-semibold">
                        <span className={f.cantidad < 0 ? 'text-error' : 'text-success'}>
                          {f.cantidad > 0 ? '+' : ''}
                          {formatearNumero(f.cantidad)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalSalida && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="text-lg font-bold">Registrar salida (método PEPS)</h3>
            <form onSubmit={enviarSalida} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="label-text">Suministro</span>
                  <select
                    className="select select-bordered"
                    value={formSalida.id_suministro}
                    onChange={(e) => {
                      setFormSalida((f) => ({ ...f, id_suministro: e.target.value }))
                      cargarLotes(e.target.value)
                    }}
                    required
                  >
                    <option value="" disabled>
                      Seleccione…
                    </option>
                    {suministros.map((s) => (
                      <option key={s.id_suministro} value={s.id_suministro}>
                        {s.codigo_producto} — {s.descripcion_completa}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Entidad</span>
                  <select
                    className="select select-bordered"
                    value={formSalida.id_entidad}
                    onChange={(e) => setFormSalida((f) => ({ ...f, id_entidad: e.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Seleccione…
                    </option>
                    {entidades.map((e) => (
                      <option key={e.id_entidad} value={e.id_entidad}>
                        {e.nombre_razon_social}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Cantidad a despachar</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input input-bordered"
                    value={formSalida.cantidad}
                    onChange={(e) => setFormSalida((f) => ({ ...f, cantidad: e.target.value }))}
                    required
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Documento de referencia</span>
                  <input
                    className="input input-bordered"
                    value={formSalida.documento_referencia}
                    onChange={(e) =>
                      setFormSalida((f) => ({ ...f, documento_referencia: e.target.value }))
                    }
                  />
                </label>
              </div>

              {lotes.length > 0 && (
                <div className="rounded-lg border border-base-300 p-3">
                  <div className="mb-2 text-sm font-semibold">
                    Disponible: {formatearNumero(saldoDisponible)} unidad(es) — orden PEPS (próximo a vencer primero)
                  </div>
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Lote</th>
                        <th>Vencimiento</th>
                        <th className="text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((l) => (
                        <tr key={l.id_lote}>
                          <td>{l.numero_lote}</td>
                          <td>{formatearFechaHora(l.fecha_vencimiento)}</td>
                          <td className="text-right">{formatearNumero(l.saldo_lote)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setModalSalida(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-error" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  Despachar
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModalSalida(false)}>cerrar</button>
          </form>
        </dialog>
      )}

      {modalReajuste && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h3 className="text-lg font-bold">Registrar reajuste</h3>
            <form onSubmit={enviarReajuste} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="label-text">Suministro</span>
                  <select
                    className="select select-bordered"
                    value={formReajuste.id_suministro}
                    onChange={(e) => {
                      setFormReajuste((f) => ({ ...f, id_suministro: e.target.value, id_lote: '' }))
                      cargarLotes(e.target.value)
                    }}
                    required
                  >
                    <option value="" disabled>
                      Seleccione…
                    </option>
                    {suministros.map((s) => (
                      <option key={s.id_suministro} value={s.id_suministro}>
                        {s.codigo_producto} — {s.descripcion_completa}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Lote</span>
                  <select
                    className="select select-bordered"
                    value={formReajuste.id_lote}
                    onChange={(e) => setFormReajuste((f) => ({ ...f, id_lote: e.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Seleccione…
                    </option>
                    {lotes.map((l) => (
                      <option key={l.id_lote} value={l.id_lote}>
                        {l.numero_lote} (saldo {l.saldo_lote})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Entidad</span>
                  <select
                    className="select select-bordered"
                    value={formReajuste.id_entidad}
                    onChange={(e) =>
                      setFormReajuste((f) => ({ ...f, id_entidad: e.target.value }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Seleccione…
                    </option>
                    {entidades.map((e) => (
                      <option key={e.id_entidad} value={e.id_entidad}>
                        {e.nombre_razon_social}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control w-full">
                  <span className="label-text">Cantidad (positiva o negativa)</span>
                  <input
                    type="number"
                    step="1"
                    className="input input-bordered"
                    value={formReajuste.cantidad}
                    onChange={(e) => setFormReajuste((f) => ({ ...f, cantidad: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setModalReajuste(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-warning" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  Guardar reajuste
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModalReajuste(false)}>cerrar</button>
          </form>
        </dialog>
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
