import { randomBytes } from 'node:crypto'
import { verifyPassword } from './password.js'

export class AuthService {
  constructor(db) {
    this.db = db
  }

  login(usuario, password) {
    if (!usuario || !password) {
      throw new Error('Ingrese usuario y contraseña.')
    }

    const user = this.db
      .prepare('SELECT * FROM usuarios WHERE usuario = ?')
      .get(usuario)

    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error('Usuario o contraseña incorrectos.')
    }

    const token = randomBytes(32).toString('hex')

    this.db.prepare('DELETE FROM sesiones WHERE id_usuario = ?').run(user.id_usuario)
    this.db
      .prepare('INSERT INTO sesiones (token, id_usuario) VALUES (?, ?)')
      .run(token, user.id_usuario)

    return {
      token,
      usuario: { id_usuario: user.id_usuario, usuario: user.usuario }
    }
  }

  sesion(token) {
    if (!token) return null
    return (
      this.db
        .prepare(
          `SELECT u.id_usuario, u.usuario
           FROM sesiones s
           JOIN usuarios u ON u.id_usuario = s.id_usuario
           WHERE s.token = ?`
        )
        .get(token) || null
    )
  }

  logout(token) {
    if (token) {
      this.db.prepare('DELETE FROM sesiones WHERE token = ?').run(token)
    }
    return { ok: true }
  }
}
