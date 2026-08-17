export function mensajeErrorSql(err, contexto) {
  switch (err.code) {
    case 'SQLITE_CONSTRAINT_UNIQUE':
      return 'Ya existe un registro con ese valor único.'
    case 'SQLITE_CONSTRAINT_FOREIGNKEY':
      return 'No se puede eliminar: el registro tiene historial asociado.'
    case 'SQLITE_CONSTRAINT_CHECK':
      return 'El valor ingresado no está permitido por las reglas de validación.'
    case 'SQLITE_CONSTRAINT_NOTNULL':
      return `Faltan datos obligatorios: ${err.message}`
    default:
      return `${contexto}: ${err.message}`
  }
}

export function requerido(valor, campo) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    throw new Error(`El campo "${campo}" es obligatorio.`)
  }
  return String(valor).trim()
}
