export class ConfiguracionService {
  constructor(db) {
    this.db = db
  }

  obtener(clave) {
    const k = String(clave || '').trim()
    if (!k) throw new Error('La clave de configuración es obligatoria.')
    const fila = this.db
      .prepare('SELECT clave, valor FROM configuracion WHERE clave = ?')
      .get(k)
    return { clave: k, valor: fila ? fila.valor : null }
  }

  guardar(clave, valor) {
    const k = String(clave || '').trim()
    if (!k) throw new Error('La clave de configuración es obligatoria.')
    const v = String(valor ?? '')
    this.db
      .prepare(
        `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
      )
      .run(k, v)
    return { clave: k, valor: v }
  }
}
