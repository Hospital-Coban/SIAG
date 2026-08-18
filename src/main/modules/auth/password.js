import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const partes = String(stored || '').split(':')
  if (partes.length !== 2) return false
  const [salt, hash] = partes
  const esperado = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return esperado.length === actual.length && timingSafeEqual(esperado, actual)
}
