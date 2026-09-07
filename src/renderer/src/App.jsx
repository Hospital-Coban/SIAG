import { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Kardex from './pages/Kardex.jsx'
import Catalogos from './pages/Catalogos.jsx'
import Donaciones from './pages/Donaciones.jsx'
import Respaldo from './pages/Respaldo.jsx'

const VISTAS = {
  dashboard: Dashboard,
  kardex: Kardex,
  catalogos: Catalogos,
  donaciones: Donaciones,
  respaldo: Respaldo
}

export default function App() {
  const [pagina, setPagina] = useState('dashboard')
  const [tema, setTema] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  const Vista = VISTAS[pagina] || Dashboard

  return (
    <Layout pagina={pagina} setPagina={setPagina} tema={tema} setTema={setTema}>
      <Vista />
    </Layout>
  )
}
