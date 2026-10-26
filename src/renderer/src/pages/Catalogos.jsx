import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'
import Modal from '../components/Modal.jsx'

const TIPOS_ENTIDAD = ['Proveedor', 'ONG', 'Distrito_Salud']

const FORM_SUM_INICIAL = { codigo_producto: '', descripcion_completa: '', cantidad_unitaria: '' }
const FORM_ENT_INICIAL = { nit_entidad: '', nombre_razon_social: '', tipo_entidad: 'Proveedor' }
const FORM_DEST_INICIAL = { nombre_destino: '' }

const TITULOS = {
  suministros: 'Suministros',
  entidades: 'Entidades',
  destinos: 'Destinos'
}

export default function Catalogos({ tipo }) {
  const [pestana, setPestana] = useState(tipo || 'suministros')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (tipo) {
      setPestana(tipo)
      setBusqueda('')
    }
  }, [tipo])
  const [suministros, setSuministros] = useState([])
  const [entidades, setEntidades] = useState([])
  const [destinos, setDestinos] = useState([])

  const destinosFiltrados = destinos.filter((d) =>
    (d.nombre_destino || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const suministrosFiltrados = suministros.filter((s) =>
    (s.codigo_producto || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.descripcion_completa || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const entidadesFiltradas = entidades.filter((e) =>
    (e.nit_entidad || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.nombre_razon_social || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.tipo_entidad || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  // Modales crear / editar
  const [modalSum, setModalSum] = useState(false)
  const [modalEnt, setModalEnt] = useState(false)
  const [modalDest, setModalDest] = useState(false)
  const [editandoSum, setEditandoSum] = useState(null)
  const [editandoEnt, setEditandoEnt] = useState(null)
  const [editandoDest, setEditandoDest] = useState(null)

  // Detalle
  const [detalleSum, setDetalleSum] = useState(null)
  const [detalleEnt, setDetalleEnt] = useState(null)
  const [detalleDest, setDetalleDest] = useState(null)

  // Eliminar
  const [eliminar, setEliminar] = useState(null)

  const [enviando, setEnviando] = useState(false)
  const [formSum, setFormSum] = useState(FORM_SUM_INICIAL)
  const [formEnt, setFormEnt] = useState(FORM_ENT_INICIAL)
  const [formDest, setFormDest] = useState(FORM_DEST_INICIAL)
  const [toast, mostrarToast, cerrarToast] = useToast()

  const cargar = async () => {
    const [resSum, resEnt, resDest] = await Promise.all([
      window.api.suministros.listar(),
      window.api.entidades.listar(),
      window.api.destinos.listar()
    ])
    if (resSum.ok) setSuministros(resSum.data)
    if (resEnt.ok) setEntidades(resEnt.data)
    if (resDest.ok) setDestinos(resDest.data)
  }

  useEffect(() => { cargar() }, [])

  // ── Suministros ──

  const abrirNuevoSum = () => {
    setEditandoSum(null)
    setFormSum(FORM_SUM_INICIAL)
    setModalSum(true)
  }

  const abrirEdicionSum = (s) => {
    setEditandoSum(s)
    setFormSum({
      codigo_producto: s.codigo_producto,
      descripcion_completa: s.descripcion_completa,
      cantidad_unitaria: s.cantidad_unitaria || ''
    })
    setModalSum(true)
  }

  const enviarSuministro = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = editandoSum
        ? await window.api.suministros.actualizar(editandoSum.id_suministro, formSum)
        : await window.api.suministros.crear(formSum)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast(editandoSum ? 'Suministro actualizado' : 'Suministro creado')
      setModalSum(false)
      setEditandoSum(null)
      setFormSum(FORM_SUM_INICIAL)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  // ── Entidades ──

  const abrirNuevoEnt = () => {
    setEditandoEnt(null)
    setFormEnt(FORM_ENT_INICIAL)
    setModalEnt(true)
  }

  const abrirEdicionEnt = (ent) => {
    setEditandoEnt(ent)
    setFormEnt({
      nit_entidad: ent.nit_entidad || '',
      nombre_razon_social: ent.nombre_razon_social,
      tipo_entidad: ent.tipo_entidad || 'Proveedor'
    })
    setModalEnt(true)
  }

  const enviarEntidad = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = editandoEnt
        ? await window.api.entidades.actualizar(editandoEnt.id_entidad, formEnt)
        : await window.api.entidades.crear(formEnt)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast(editandoEnt ? 'Entidad actualizada' : 'Entidad creada')
      setModalEnt(false)
      setEditandoEnt(null)
      setFormEnt(FORM_ENT_INICIAL)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  // ── Destinos ──

  const abrirNuevoDest = () => {
    setEditandoDest(null)
    setFormDest(FORM_DEST_INICIAL)
    setModalDest(true)
  }

  const abrirEdicionDest = (d) => {
    setEditandoDest(d)
    setFormDest({ nombre_destino: d.nombre_destino })
    setModalDest(true)
  }

  const enviarDestino = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = editandoDest
        ? await window.api.destinos.actualizar(editandoDest.id_destino, formDest)
        : await window.api.destinos.crear(formDest)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast(editandoDest ? 'Destino actualizado' : 'Destino creado')
      setModalDest(false)
      setEditandoDest(null)
      setFormDest(FORM_DEST_INICIAL)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  // ── Eliminar ──

  const confirmarEliminar = async () => {
    setEnviando(true)
    try {
      const res =
        eliminar.tipo === 'suministro'
          ? await window.api.suministros.eliminar(eliminar.id)
          : eliminar.tipo === 'entidad'
            ? await window.api.entidades.eliminar(eliminar.id)
            : await window.api.destinos.eliminar(eliminar.id)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
      } else {
        mostrarToast('Registro eliminado')
      }
      setEliminar(null)
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{TITULOS[pestana] || 'Catálogos'}</h1>

      {/* ════════════════ TABLA SUMINISTROS ════════════════ */}
      {pestana === 'suministros' ? (
        <div className="rounded-box bg-base-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-4">
            <h2 className="text-lg font-semibold">Catálogo de suministros</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar suministro..."
                className="input input-sm input-bordered w-full max-w-xs"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button className="btn btn-outline btn-primary btn-sm" onClick={abrirNuevoSum}>
                Agregar
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="max-h-[60vh] overflow-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suministrosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center opacity-60 py-8">
                        No se encontraron suministros.
                      </td>
                    </tr>
                  )}
                  {suministrosFiltrados.map((s) => (
                    <tr key={s.id_suministro}>
                      <td className="whitespace-nowrap font-mono">{s.codigo_producto}</td>
                      <td>
                        <div className="max-w-[60vw] sm:max-w-xs" title={s.descripcion_completa}>
                          {s.descripcion_completa}
                        </div>
                      </td>
                      <td className="whitespace-nowrap opacity-70">{s.cantidad_unitaria}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                             className="btn btn-outline btn-info btn-xs btn-square"
                            onClick={() => setDetalleSum(s)}
                            title="Ver detalle"
                          >
                            <Icon name="documento" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-warning btn-xs btn-square"
                            onClick={() => abrirEdicionSum(s)}
                            title="Editar"
                          >
                            <Icon name="lápiz" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-error btn-xs btn-square"
                            onClick={() => setEliminar({ tipo: 'suministro', id: s.id_suministro, nombre: s.codigo_producto })}
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
          </div>
        </div>
      ) : pestana === 'entidades' ? (
        /* ════════════════ TABLA ENTIDADES ════════════════ */
        <div className="rounded-box bg-base-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-4">
            <h2 className="text-lg font-semibold">Catálogo de entidades</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar entidad..."
                className="input input-sm input-bordered w-full max-w-xs"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button className="btn btn-outline btn-primary btn-sm" onClick={abrirNuevoEnt}>
                Agregar
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="max-h-[60vh] overflow-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>NIT</th>
                    <th>Nombre / razón social</th>
                    <th>Tipo</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entidadesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center opacity-60 py-8">
                        No se encontraron entidades.
                      </td>
                    </tr>
                  )}
                  {entidadesFiltradas.map((ent) => (
                    <tr key={ent.id_entidad}>
                      <td className="whitespace-nowrap font-mono">{ent.nit_entidad || '—'}</td>
                      <td>
                        <div className="max-w-[60vw] sm:max-w-xs" title={ent.nombre_razon_social}>
                          {ent.nombre_razon_social}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-sm badge-outline whitespace-nowrap">{ent.tipo_entidad}</span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                             className="btn btn-outline btn-info btn-xs btn-square"
                            onClick={() => setDetalleEnt(ent)}
                            title="Ver detalle"
                          >
                            <Icon name="documento" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-warning btn-xs btn-square"
                            onClick={() => abrirEdicionEnt(ent)}
                            title="Editar"
                          >
                            <Icon name="lápiz" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-error btn-xs btn-square"
                            onClick={() => setEliminar({ tipo: 'entidad', id: ent.id_entidad, nombre: ent.nombre_razon_social })}
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
          </div>
        </div>
      ) : (
        /* ════════════════ TABLA DESTINOS ════════════════ */
        <div className="rounded-box bg-base-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-4">
            <h2 className="text-lg font-semibold">Catálogo de destinos</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar destino..."
                className="input input-sm input-bordered w-full max-w-xs"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button className="btn btn-outline btn-primary btn-sm" onClick={abrirNuevoDest}>
                Agregar
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="max-h-[60vh] overflow-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Destino</th>
                    <th className="text-right">Movimientos</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {destinosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center opacity-60 py-8">
                        No se encontraron destinos.
                      </td>
                    </tr>
                  )}
                  {destinosFiltrados.map((d) => (
                    <tr key={d.id_destino}>
                      <td>
                        <div className="max-w-[60vw] sm:max-w-xs" title={d.nombre_destino}>
                          {d.nombre_destino}
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap opacity-70">{d.movimientos}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                             className="btn btn-outline btn-info btn-xs btn-square"
                            onClick={() => setDetalleDest(d)}
                            title="Ver detalle"
                          >
                            <Icon name="documento" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-warning btn-xs btn-square"
                            onClick={() => abrirEdicionDest(d)}
                            title="Editar"
                          >
                            <Icon name="lápiz" className="h-4 w-4" />
                          </button>
                          <button
                             className="btn btn-outline btn-error btn-xs btn-square"
                            onClick={() => setEliminar({ tipo: 'destino', id: d.id_destino, nombre: d.nombre_destino })}
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
          </div>
        </div>
      )}

      {/* ════════════════ MODAL SUMINISTRO (crear / editar) ════════════════ */}
      {modalSum && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">{editandoSum ? 'Editar suministro' : 'Nuevo suministro'}</h3>
            <form onSubmit={enviarSuministro} className="mt-4 space-y-4">
              <label className="form-control w-full">
                <span className="label-text">Código de producto</span>
                <input
                  className="input input-bordered"
                  value={formSum.codigo_producto}
                  onChange={(e) => setFormSum((f) => ({ ...f, codigo_producto: e.target.value }))}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Descripción completa</span>
                <input
                  className="input input-bordered"
                  value={formSum.descripcion_completa}
                  onChange={(e) => setFormSum((f) => ({ ...f, descripcion_completa: e.target.value }))}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Cantidad unitaria</span>
                <input
                  className="input input-bordered"
                  placeholder="Ej. CAJA/540 GOTERO"
                  value={formSum.cantidad_unitaria}
                  onChange={(e) => setFormSum((f) => ({ ...f, cantidad_unitaria: e.target.value }))}
                  required
                />
              </label>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => { setModalSum(false); setEditandoSum(null) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-outline btn-primary" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  {editandoSum ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => { setModalSum(false); setEditandoSum(null) }}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL ENTIDAD (crear / editar) ════════════════ */}
      {modalEnt && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">{editandoEnt ? 'Editar entidad' : 'Nueva entidad'}</h3>
            <form onSubmit={enviarEntidad} className="mt-4 space-y-4">
              <label className="form-control w-full">
                <span className="label-text">NIT</span>
                <input
                  className="input input-bordered"
                  value={formEnt.nit_entidad}
                  onChange={(e) => setFormEnt((f) => ({ ...f, nit_entidad: e.target.value }))}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Nombre / razón social</span>
                <input
                  className="input input-bordered"
                  value={formEnt.nombre_razon_social}
                  onChange={(e) => setFormEnt((f) => ({ ...f, nombre_razon_social: e.target.value }))}
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Tipo de entidad</span>
                <select
                  className="select select-bordered"
                  value={formEnt.tipo_entidad}
                  onChange={(e) => setFormEnt((f) => ({ ...f, tipo_entidad: e.target.value }))}
                >
                  {TIPOS_ENTIDAD.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => { setModalEnt(false); setEditandoEnt(null) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-outline btn-primary" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  {editandoEnt ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => { setModalEnt(false); setEditandoEnt(null) }}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL DETALLE SUMINISTRO ════════════════ */}
      {detalleSum && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">Detalle del suministro</h3>
            <table className="table table-sm mt-4">
              <tbody>
                {[
                  ['Código de producto', detalleSum.codigo_producto],
                  ['Descripción completa', detalleSum.descripcion_completa],
                  ['Cantidad unitaria', detalleSum.cantidad_unitaria]
                ].map(([etiqueta, valor]) => (
                  <tr key={etiqueta}>
                    <td className="w-1/2 align-top opacity-60">{etiqueta}</td>
                    <td className="break-words">{valor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-action">
              <button className="btn btn-outline btn-primary" onClick={() => { abrirEdicionSum(detalleSum); setDetalleSum(null) }}>
                Editar
              </button>
              <button className="btn btn-ghost" onClick={() => setDetalleSum(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDetalleSum(null)}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL DETALLE ENTIDAD ════════════════ */}
      {detalleEnt && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">Detalle de la entidad</h3>
            <table className="table table-sm mt-4">
              <tbody>
                {[
                  ['NIT', detalleEnt.nit_entidad],
                  ['Nombre / razón social', detalleEnt.nombre_razon_social],
                  ['Tipo de entidad', detalleEnt.tipo_entidad?.replace('_', ' ')]
                ].map(([etiqueta, valor]) => (
                  <tr key={etiqueta}>
                    <td className="w-1/2 align-top opacity-60">{etiqueta}</td>
                    <td className="break-words">{valor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-action">
              <button className="btn btn-outline btn-primary" onClick={() => { abrirEdicionEnt(detalleEnt); setDetalleEnt(null) }}>
                Editar
              </button>
              <button className="btn btn-ghost" onClick={() => setDetalleEnt(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDetalleEnt(null)}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL DESTINO (crear / editar) ════════════════ */}
      {modalDest && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">{editandoDest ? 'Editar destino' : 'Nuevo destino'}</h3>
            <p className="mt-1 text-sm opacity-60">
              Lugar físico al que se despacha un suministro en una salida.
            </p>
            <form onSubmit={enviarDestino} className="mt-4 space-y-4">
              <label className="form-control w-full">
                <span className="label-text">Nombre del destino</span>
                <input
                  className="input input-bordered"
                  placeholder="Ej. Municipios de Alta Verapaz"
                  value={formDest.nombre_destino}
                  onChange={(e) => setFormDest((f) => ({ ...f, nombre_destino: e.target.value }))}
                  required
                />
              </label>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => { setModalDest(false); setEditandoDest(null) }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-outline btn-primary" disabled={enviando}>
                  {enviando && <span className="loading loading-spinner loading-sm" />}
                  {editandoDest ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => { setModalDest(false); setEditandoDest(null) }}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL DETALLE DESTINO ════════════════ */}
      {detalleDest && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">Detalle del destino</h3>
            <table className="table table-sm mt-4">
              <tbody>
                {[
                  ['Destino', detalleDest.nombre_destino],
                  ['Movimientos de kardex', detalleDest.movimientos]
                ].map(([etiqueta, valor]) => (
                  <tr key={etiqueta}>
                    <td className="w-1/2 align-top opacity-60">{etiqueta}</td>
                    <td className="break-words">{valor ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-action">
              <button className="btn btn-outline btn-primary" onClick={() => { abrirEdicionDest(detalleDest); setDetalleDest(null) }}>
                Editar
              </button>
              <button className="btn btn-ghost" onClick={() => setDetalleDest(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setDetalleDest(null)}>cerrar</button>
          </form>
        </Modal>
      )}

      {/* ════════════════ MODAL CONFIRMAR ELIMINACIÓN ════════════════ */}
      {eliminar && (
        <Modal>
          <div className="modal-box">
            <h3 className="text-lg font-bold">Confirmar eliminación</h3>
            <p className="py-4">
              ¿Eliminar <strong>{eliminar.nombre}</strong>? Si tiene movimientos asociados, el
              sistema impedirá la eliminación para preservar el historial.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEliminar(null)}>
                Cancelar
              </button>
              <button className="btn btn-outline btn-error" onClick={confirmarEliminar} disabled={enviando}>
                {enviando && <span className="loading loading-spinner loading-sm" />}
                Eliminar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEliminar(null)}>cerrar</button>
          </form>
        </Modal>
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
