import { useState } from 'react'
import Icon from '../components/Icon.jsx'

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const res = await window.api.auth.login(usuario, password)
      if (!res.ok) {
        setError(res.error)
        return
      }
      localStorage.setItem('token', res.data.token)
      onLogin(res.data.usuario)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col items-center gap-2 pb-2">
            <Icon name="respaldo" className="h-10 w-10 text-primary" />
            <h1 className="text-xl font-bold">Inventario Hospitalario</h1>
            <p className="text-sm opacity-60">Inicie sesión para continuar</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="form-control w-full">
              <span className="label-text">Usuario</span>
              <input
                className="input input-bordered"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text">Contraseña</span>
              <input
                type="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <div className="alert alert-error text-sm">{error}</div>}
            <button type="submit" className="btn btn-soft btn-primary w-full" disabled={enviando}>
              {enviando && <span className="loading loading-spinner loading-sm" />}
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
