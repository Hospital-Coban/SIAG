export const MONEDA = 'GTQ'
export const LOCALE = 'es-GT'

export function formatearFecha(valor) {
  if (!valor) return '—'
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : `${valor.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return valor
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatearFechaHora(valor) {
  if (!valor) return '—'
  const d = new Date(`${String(valor).replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return valor
  return d.toLocaleString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatearMoneda(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: MONEDA
  }).format(n)
}

export function formatearNumero(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(LOCALE).format(n)
}
