import Icon from './Icon.jsx'
import logo from '../assets/icon.png'

export const PAGINAS = [
  { id: 'dashboard', etiqueta: 'Dashboard', icono: 'dashboard' },
  { id: 'kardex', etiqueta: 'Inventario', icono: 'kardex' },
  { id: 'suministros', etiqueta: 'Suministros', icono: 'catalogos' },
  { id: 'entidades', etiqueta: 'Entidades', icono: 'catalogos' },
  { id: 'destinos', etiqueta: 'Destinos', icono: 'catalogos' },
  { id: 'donaciones', etiqueta: 'Donaciones', icono: 'donaciones' },
  { id: 'configuracion', etiqueta: 'Configuración', icono: 'ajustes' }
]

export default function Layout({ pagina, setPagina, children }) {
  return (
    <div className="drawer min-h-dvh lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-w-0 flex-col">
        <div className="navbar bg-base-200 shadow-sm">
          <div className="flex-none lg:hidden">
            <label htmlFor="drawer" aria-label="Abrir menú" className="btn btn-soft btn-neutral btn-square">
              <Icon name="menu" />
            </label>
          </div>
          <div className="min-w-0 flex-1 px-3 sm:px-4">
            <span className="text-base font-semibold leading-tight sm:text-lg">Almacén y Donaciones</span>
          </div>
        </div>

        <main className="min-w-0 flex-1 bg-base-200 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl">{children}</div>
        </main>
      </div>

      <div className="drawer-side">
        <label htmlFor="drawer" aria-label="Cerrar menú" className="drawer-overlay" />
        <aside className="bg-base-200 w-64 min-h-full max-w-[85vw]">
          <div className="flex items-center gap-3 px-4 py-5">
            <img src={logo} alt="" className="h-12 w-12 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight text-base-content">SIAG Almacén</p>
              <p className="mt-1 text-xs leading-relaxed text-base-content/70">Inventario y Donaciones</p>
            </div>
          </div>
          <ul className="menu w-full gap-1 px-2">
            {PAGINAS.map((p) => (
              <li key={p.id}>
                <button
                   className={p.id === pagina
                     ? 'border-l-4 border-primary bg-primary/15 font-semibold text-primary focus:outline-none'
                     : 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'}
                   aria-current={p.id === pagina ? 'page' : undefined}
                   onClick={() => {
                     setPagina(p.id)
                     const drawer = document.getElementById('drawer')
                     if (drawer) drawer.checked = false
                   }}
                >
                  <Icon name={p.icono} />
                  {p.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
