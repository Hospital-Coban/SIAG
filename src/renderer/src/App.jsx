import { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Kardex from './pages/Kardex.jsx'
import Catalogos from './pages/Catalogos.jsx'
import Donaciones from './pages/Donaciones.jsx'
import Configuracion from './pages/Configuracion.jsx'

const VISTAS = {
  dashboard: Dashboard,
  kardex: Kardex,
  donaciones: Donaciones,
  configuracion: Configuracion
}

export default function App() {
  const [pagina, setPagina] = useState('dashboard')
  const [tema, setTema] = useState(() => {
    const preferencia = localStorage.getItem('preferenciaTema') || 'light'
    if (preferencia === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return preferencia
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  let Vista
  if (pagina === 'suministros' || pagina === 'entidades' || pagina === 'destinos') {
    Vista = <Catalogos tipo={pagina} />
  } else if (pagina === 'configuracion') {
    Vista = <Configuracion temaActual={tema} setTemaGlobal={setTema} />
  } else {
    const Componente = VISTAS[pagina] || Dashboard
    Vista = <Componente />
  }

  return (
    <Layout pagina={pagina} setPagina={setPagina}>
      {Vista}
    </Layout>
  )
}
