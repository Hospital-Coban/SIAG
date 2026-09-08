import Icon from './Icon.jsx'

export const PAGINAS = [
  { id: 'dashboard', etiqueta: 'Dashboard', icono: 'dashboard' },
  { id: 'kardex', etiqueta: 'Kardex', icono: 'kardex' },
  { id: 'catalogos', etiqueta: 'Catálogos', icono: 'catalogos' },
  { id: 'donaciones', etiqueta: 'Donaciones', icono: 'donaciones' },
  { id: 'respaldo', etiqueta: 'Respaldo', icono: 'respaldo' }
]

export default function Layout({ pagina, setPagina, tema, setTema, usuario, onLogout, children }) {
  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-200 shadow-sm">
          <div className="flex-none lg:hidden">
            <label htmlFor="drawer" className="btn btn-square btn-ghost">
              <Icon name="menu" />
            </label>
          </div>
          <div className="flex-1">
            <span className="text-lg font-semibold">Inventario Hospitalario</span>
          </div>
          <div className="flex flex-none items-center gap-1">
            <span className="badge badge-ghost gap-1">
              <Icon name="usuario" className="h-4 w-4" />
              {usuario}
            </span>
            <button
              className="btn btn-ghost btn-circle"
              onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
              title="Cambiar tema"
            >
              <Icon name={tema === 'dark' ? 'sol' : 'luna'} />
            </button>
            <button className="btn btn-ghost btn-circle" onClick={onLogout} title="Cerrar sesión">
              <Icon name="salir" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      <div className="drawer-side">
        <label htmlFor="drawer" aria-label="Cerrar menú" className="drawer-overlay" />
        <aside className="bg-base-200 w-64 min-h-full">
          <div className="px-4 py-5 text-xl font-bold">
            <span className="text-primary">Inventario</span> Hospitalario
          </div>
          <ul className="menu w-full gap-1 px-2">
            {PAGINAS.map((p) => (
              <li key={p.id}>
                <button
                  className={p.id === pagina ? 'active' : ''}
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
