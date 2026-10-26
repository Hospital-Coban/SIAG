export const DIAS_SEMAFORO_ROJO = 180
export const DIAS_SEMAFORO_AMARILLO = 365

export const ETIQUETA_ESTADO = {
  verde: 'VERDE',
  amarillo: 'AMARILLO',
  rojo: 'ROJO'
}

export function diasParaVencer(fechaVenc) {
  if (!fechaVenc) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(`${String(fechaVenc).slice(0, 10)}T00:00:00`)
  return Math.floor((venc - hoy) / (1000 * 60 * 60 * 24))
}

export function estadoVencimiento(fechaVenc) {
  const dias = diasParaVencer(fechaVenc)
  if (dias == null) return 'verde'
  if (dias < DIAS_SEMAFORO_ROJO) return 'rojo'
  if (dias <= DIAS_SEMAFORO_AMARILLO) return 'amarillo'
  return 'verde'
}
