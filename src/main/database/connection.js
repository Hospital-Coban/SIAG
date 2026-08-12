import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { initSchema } from './schema.js'
import { seedDemo } from './seed.js'

let db = null

export function getDb() {
  if (db) return db
  throw new Error('La base de datos aún no ha sido inicializada')
}

export function initDb() {
  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })

  const dbPath = path.join(dir, 'database.sqlite')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  initSchema(db)
  seedDemo(db)

  return db
}
