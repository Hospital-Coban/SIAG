import { useEffect, useMemo, useState } from 'react'
import { formatearFecha, formatearMoneda, formatearNumero } from '../lib/util.js'
import Icon from '../components/Icon.jsx'
import Toast from '../components/Toast.jsx'
import { useToast } from '../lib/useToast.js'

function primerDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function ultimoDiaMes() {
  const d = new Date()
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`
}

function nombreMes(fechaStr) {
  if (!fechaStr) return ''
  const d = new Date(`${fechaStr}T00:00:00`)
  return d.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
}

function estadoVencimiento(fechaVenc) {
  if (!fechaVenc) return 'verde'
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(`${fechaVenc}T00:00:00`)
  const diffDays = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24))
  if (diffDays < 180) return 'rojo'
  if (diffDays <= 365) return 'amarillo'
  return 'verde'
}

const CLASE_FILA = {
  rojo: 'bg-error/20 text-base-content',
  amarillo: 'bg-warning/20 text-base-content',
  verde: 'bg-success/20 text-base-content'
}

const BADGE_ESTADO = {
  rojo: 'badge-error',
  amarillo: 'badge-warning',
  verde: 'badge-success'
}

const ETIQUETA_ESTADO = {
  rojo: '< 6 meses',
  amarillo: '6 a 12 meses',
  verde: '> 12 meses'
}

export default function Dashboard() {
  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [toast, mostrarToast, cerrarToast] = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes())
  const [fechaHasta, setFechaHasta] = useState(ultimoDiaMes())
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [exportando, setExportando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await window.api.inventario.reporte({
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined
      })
      if (res.ok) {
        setLotes(res.data)
      } else {
        mostrarToast(res.error, 'error')
      }
    } catch {
      mostrarToast('Error al cargar el reporte', 'error')
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const aplicarFiltros = () => {
    cargar()
  }

  const filasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return lotes.filter((f) => {
      if (filtroEstado !== 'todos') {
        const estado = estadoVencimiento(f.fecha_vencimiento)
        if (estado !== filtroEstado) return false
      }
      if (!termino) return true
      const campos = [
        f.codigo_producto,
        f.descripcion_completa,
        f.cantidad_unitaria,
        f.numero_lote
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return campos.includes(termino)
    })
  }, [lotes, busqueda, filtroEstado])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFechaDesde(primerDiaMes())
    setFechaHasta(ultimoDiaMes())
    setFiltroEstado('todos')
  }

  const totalExistencias = filasFiltradas.reduce((acc, f) => acc + (f.saldo_lote || 0), 0)
  const totalValor = filasFiltradas.reduce(
    (acc, f) => acc + (f.saldo_lote || 0) * (f.precio_unitario || 0),
    0
  )

  const conteoEstados = useMemo(() => {
    const conteo = { rojo: 0, amarillo: 0, verde: 0 }
    filasFiltradas.forEach((f) => {
      const estado = estadoVencimiento(f.fecha_vencimiento)
      conteo[estado]++
    })
    return conteo
  }, [filasFiltradas])

  const exportarExcel = async () => {
    if (filasFiltradas.length === 0) {
      mostrarToast('No hay datos que exportar', 'error')
      return
    }

    setExportando(true)
    try {
      const res = await window.api.inventario.exportarSemaforo({
        datos: filasFiltradas,
        filtros: {
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined
        }
      })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Semáforo de Inventario Hospitalario</h1>
          <p className="text-sm opacity-60 mt-1">
            {nombreMes(fechaDesde)} a {nombreMes(fechaHasta)}
          </p>
        </div>
        <button
          className="btn btn-success btn-outline"
          onClick={exportarExcel}
          disabled={exportando}
        >
          {exportando ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Icon name="descargar" className="h-4 w-4" />
          )}
          Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="stat rounded-box bg-success/10 shadow-sm py-3 px-4">
          <div className="stat-title text-xs">&gt; 12 meses</div>
          <div className="stat-value text-lg text-success">{conteoEstados.verde}</div>
        </div>
        <div className="stat rounded-box bg-warning/10 shadow-sm py-3 px-4">
          <div className="stat-title text-xs">6 a 12 meses</div>
          <div className="stat-value text-lg text-warning">{conteoEstados.amarillo}</div>
        </div>
        <div className="stat rounded-box bg-error/10 shadow-sm py-3 px-4">
          <div className="stat-title text-xs">&lt; 6 meses</div>
          <div className="stat-value text-lg text-error">{conteoEstados.rojo}</div>
        </div>
      </div>

      <div className="rounded-box bg-base-200/50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control w-full sm:max-w-xs">
            <span className="label-text">Buscar</span>
            <input
              type="search"
              className="input input-bordered input-sm"
              placeholder="Producto, lote, presentación…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <label className="form-control w-full sm:w-40">
            <span className="label-text">Desde</span>
            <input
              type="date"
              className="input input-bordered input-sm w-full"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </label>
          <label className="form-control w-full sm:w-40">
            <span className="label-text">Hasta</span>
            <input
              type="date"
              className="input input-bordered input-sm w-full"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </label>
          <label className="form-control w-full sm:w-48">
            <span className="label-text">Estado</span>
            <select
              className="select select-bordered select-sm w-full"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="verde">&gt; 12 meses (Verde)</option>
              <option value="amarillo">6 a 12 meses (Amarillo)</option>
              <option value="rojo">&lt; 6 meses (Rojo)</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={aplicarFiltros}
          >
            Consultar
          </button>
          {(busqueda || filtroEstado !== 'todos' || fechaDesde !== primerDiaMes() || fechaHasta !== ultimoDiaMes()) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limpiarFiltros}>
              Limpiar
            </button>
          )}
          <span className="w-full text-sm opacity-60 sm:w-auto sm:pb-1">
            {filasFiltradas.length} de {lotes.length} registro(s)
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="badge badge-success gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          &gt; 12 meses
        </span>
        <span className="badge badge-warning gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Entre 6 y 12 meses
        </span>
        <span className="badge badge-error gap-1">
          <span className="w-2 h-2 rounded-full bg-error" />
          &lt; 6 meses
        </span>
      </div>

      <div className="rounded-box bg-base-100 shadow-sm">
        <div className="p-4">
          {cargando ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
               <table className="table table-sm table-pin-rows whitespace-nowrap text-base-content">
                <thead className="sticky top-0 bg-base-200 z-10">
                  <tr>
                    <th className="w-12">No.</th>
                    <th>Descripción</th>
                    <th>Presentación</th>
                    <th>Lote</th>
                    <th>Fecha de Vencimiento</th>
                    <th>Estado</th>
                    <th>No. Kardex</th>
                    <th className="text-right">Precio Unitario</th>
                    <th className="text-right">Existencias</th>
                    <th className="text-right">Precio Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center opacity-60 py-8">
                        No se encontraron registros de inventario.
                      </td>
                    </tr>
                  )}
                  {filasFiltradas.map((f, i) => {
                    const estado = estadoVencimiento(f.fecha_vencimiento)
                    const precioTotal = (f.saldo_lote || 0) * (f.precio_unitario || 0)
                    return (
                   <tr key={`${f.id_lote}-${i}`} className={`${CLASE_FILA[estado]} text-base-content`}>
                        <td className="font-mono text-xs opacity-70">{i + 1}</td>
                        <td>
                          <div className="font-mono text-xs opacity-50">{f.codigo_producto}</div>
                          <div className="max-w-[60vw] truncate sm:max-w-xs" title={f.descripcion_completa}>
                            {f.descripcion_completa}
                          </div>
                        </td>
                        <td className="opacity-80">{f.cantidad_unitaria}</td>
                        <td className="font-mono">{f.numero_lote}</td>
                        <td className="whitespace-nowrap">
                          {formatearFecha(f.fecha_vencimiento)}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${BADGE_ESTADO[estado]}`}>
                            {ETIQUETA_ESTADO[estado]}
                          </span>
                        </td>
                        <td className="font-mono">{f.numero_kardex || ''}</td>
                        <td className="text-right font-mono">
                          {formatearMoneda(f.precio_unitario)}
                        </td>
                        <td className="text-right font-semibold">
                          <span className={f.saldo_lote <= 0 ? 'text-error' : ''}>
                            {formatearNumero(f.saldo_lote)}
                          </span>
                        </td>
                        <td className="text-right font-mono">
                          {formatearMoneda(precioTotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {filasFiltradas.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-base-200 font-bold">
                    <tr>
                      <td colSpan={7} className="text-right">
                        TOTAL:
                      </td>
                      <td className="text-right">{formatearNumero(totalExistencias)}</td>
                      <td className="text-right">{formatearMoneda(totalValor)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      <Toast mensaje={toast?.mensaje} tipo={toast?.tipo} onCerrar={cerrarToast} />
    </div>
  )
}
