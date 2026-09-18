import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { initSchema } from '../src/main/database/schema.js'
import { seedDemo, seedUsuario } from '../src/main/database/seed.js'

// Uso (desde Electron como Node):
//   set ELECTRON_RUN_AS_NODE=1 && electron.exe scripts/crear-db.cjs <ruta.sqlite>
const ruta = process.argv[2]
if (!ruta) {
  console.error('Uso: crear-db.cjs <ruta.sqlite>')
  process.exit(1)
}

fs.mkdirSync(path.dirname(ruta), { recursive: true })

const db = new Database(ruta)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
initSchema(db)
seedUsuario(db)
seedDemo(db)

const tablas = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((t) => t.name)

const conteo = {}
for (const t of tablas) {
  conteo[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n
}

console.log('Base de datos creada en: ' + ruta)
console.log('Tablas: ' + tablas.join(', '))
console.log('Registros: ' + JSON.stringify(conteo))
db.close()
