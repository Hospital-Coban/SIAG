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

export default function Layout({ pagina, setPagina, onLogout, children }) {
  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-200 shadow-sm">
          <div className="flex-none lg:hidden">
            <label htmlFor="drawer" className="btn btn-soft btn-neutral btn-square">
              <Icon name="menu" />
            </label>
          </div>
          <div className="flex-1" />
          <div className="flex min-w-0 flex-none items-center gap-1">
            <button className="btn btn-soft btn-neutral btn-circle" onClick={onLogout} title="Cerrar sesión">
              <Icon name="salir" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-base-200 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>

      <div className="drawer-side">
        <label htmlFor="drawer" aria-label="Cerrar menú" className="drawer-overlay" />
        <aside className="bg-base-200 w-64 min-h-full max-w-[85vw]">
          <div className="px-4 py-5">
            <img src={logo} alt="Inventario Hospitalario" className="h-12 w-auto" />
          </div>
          <ul className="menu w-full gap-1 px-2">
            {PAGINAS.map((p) => (
              <li key={p.id}>
                <button
                   className={p.id === pagina
                     ? 'border-l-4 border-primary bg-primary/15 font-semibold text-primary focus:outline-none'
                     : 'focus:outline-none'}
                  onClick={() => setPagina(p.id)}
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
