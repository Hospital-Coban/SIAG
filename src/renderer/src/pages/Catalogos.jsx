import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'

const TIPOS_ENTIDAD = ['Proveedor', 'ONG', 'Distrito_Salud']

export default function Catalogos() {
  const [pestana, setPestana] = useState('suministros')
  const [suministros, setSuministros] = useState([])
  const [entidades, setEntidades] = useState([])
  const [modalSum, setModalSum] = useState(false)
  const [modalEnt, setModalEnt] = useState(false)
  const [eliminar, setEliminar] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [formSum, setFormSum] = useState({
    codigo_producto: '',
    descripcion_completa: '',
    cantidad_unitaria: ''
  })
  const [formEnt, setFormEnt] = useState({
    nit_entidad: '',
    nombre_razon_social: '',
    tipo_entidad: 'Proveedor'
  })
  const [toast, mostrarToast, cerrarToast] = useToast()

  const cargar = async () => {
    const [resSum, resEnt] = await Promise.all([
      window.api.suministros.listar(),
      window.api.entidades.listar()
    ])
    if (resSum.ok) setSuministros(resSum.data)
    if (resEnt.ok) setEntidades(resEnt.data)
  }

  useEffect(() => {
    cargar()
  }, [])

  const enviarSuministro = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await window.api.suministros.crear(formSum)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Suministro creado')
      setModalSum(false)
      setFormSum({ codigo_producto: '', descripcion_completa: '', cantidad_unitaria: '' })
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  const enviarEntidad = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await window.api.entidades.crear(formEnt)
      if (!res.ok) {
        mostrarToast(res.error, 'error')
        return
      }
      mostrarToast('Entidad creada')
      setModalEnt(false)
      setFormEnt({ nit_entidad: '', nombre_razon_social: '', tipo_entidad: 'Proveedor' })
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  const confirmarEliminar = async () => {
    setEnviando(true)
    try {
      const res =
        eliminar.tipo === 'suministro'
          ? await window.api.suministros.eliminar(eliminar.id)
          : await window.api.entidades.eliminar(eliminar.id)
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
      <h1 className="text-2xl font-bold">Catálogos</h1>

      <div className="tabs tabs-boxed w-fit">
        <button
          className={`tab ${pestana === 'suministros' ? 'tab-active' : ''}`}
          onClick={() => setPestana('suministros')}
        >
          Suministros
        </button>
        <button
          className={`tab ${pestana === 'entidades' ? 'tab-active' : ''}`}
          onClick={() => setPestana('entidades')}
        >
          Entidades
        </button>
      </div>

      {pestana === 'suministros' ? (
        <div className="rounded-box bg-base-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-lg font-semibold">Catálogo de suministros</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModalSum(true)}>
              Agregar
            </button>
          </div>
          <div className="p-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Unidad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {suministros.map((s) => (
                    <tr key={s.id_suministro}>
                      <td className="font-mono">{s.codigo_producto}</td>
                      <td>{s.descripcion_completa}</td>
                      <td className="opacity-70">{s.cantidad_unitaria}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => setEliminar({ tipo: 'suministro', id: s.id_suministro, nombre: s.codigo_producto })}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-box bg-base-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-lg font-semibold">Catálogo de entidades</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModalEnt(true)}>
              Agregar
            </button>
          </div>
          <div className="p-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>NIT</th>
                    <th>Nombre / razón social</th>
                    <th>Tipo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entidades.map((e) => (
                    <tr key={e.id_entidad}>
                      <td className="font-mono">{e.nit_entidad || '—'}</td>
                      <td>{e.nombre_razon_social}</td>
                      <td>
                        <span className="badge badge-sm badge-outline">{e.tipo_entidad}</span>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => setEliminar({ tipo: 'entidad', id: e.id_entidad, nombre: e.nombre_razon_social })}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modalSum && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Nuevo suministro</h3>
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
                  onChange={(e) =>
                    setFormSum((f) => ({ ...f, descripcion_completa: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text">Cantidad unitaria</span>
                <input
                  className="input input-bordered"
                  placeholder="Ej. CAJA/540 GOTERO"
                  value={formSum.cantidad_unitaria}
                  onChange={(e) =>
                    setFormSum((f) => ({ ...f, cantidad_unitaria: e.target.value }))
                  }
                  required
                />
              </label>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setModalSum(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModalSum(false)}>cerrar</button>
          </form>
        </dialog>
      )}

      {modalEnt && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Nueva entidad</h3>
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
                  onChange={(e) =>
                    setFormEnt((f) => ({ ...f, nombre_razon_social: e.target.value }))
                  }
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
                <button type="button" className="btn btn-ghost" onClick={() => setModalEnt(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModalEnt(false)}>cerrar</button>
          </form>
        </dialog>
      )}

      {eliminar && (
        <dialog className="modal modal-open">
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
              <button className="btn btn-error" onClick={confirmarEliminar} disabled={enviando}>
                Eliminar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEliminar(null)}>cerrar</button>
          </form>
        </dialog>
      )}

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
