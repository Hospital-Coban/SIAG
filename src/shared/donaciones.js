// El orden coincide con el formato del programa de donaciones.
export const CAMPOS_DONACION = [
  ['ano_donacion', 'Año de la donación', 'number'],
  ['no_expediente', 'No. de expediente'],
  ['nombre_ong', 'ONG donante', 'donante'],
  ['tipo_donacion', 'Tipo de donación'],
  ['descripcion_completa', 'Descripción de la donación'],
  ['cantidad', 'Cantidad', 'number'],
  ['precio_unitario', 'Valor unitario en Q', 'money'],
  ['monto_total', 'Monto total en Q', 'total'],
  ['no_caso_ucni', 'No. de caso en Unidad de Cooperación Nacional e Internacional (UCNI)'],
  ['numero_siges', 'Número de SIAD'],
  ['nombre_licenciado_ucni', 'Nombre del licenciado(a) que lleva el caso en UCNI'],
  ['no_carta_intencion', 'No. de carta de intención de donación'],
  ['fecha_carta_intencion', 'Fecha de la carta de intención de donación', 'date'],
  ['dictamen_tecnico', 'Dictamen técnico número'],
  ['fecha_dictamen_tecnico', 'Fecha del dictamen técnico', 'date'],
  ['no_carta_agradecimiento', 'Número de la carta de agradecimiento del ministro'],
  ['fecha_carta_agradecimiento', 'Fecha de la carta de agradecimiento del ministro', 'date'],
  ['no_acta_administrativa', 'No. de acta administrativa'],
  ['fecha_suscripcion_acta', 'Fecha de suscripción del acta', 'date'],
  ['no_ingreso_almacen', 'No. de ingreso a almacén 1-H'],
  ['anexo_utilizado', 'Anexo utilizado'],
  ['no_oficio_entrega', 'No. de oficio de entrega del expediente de donación'],
  ['no_acuerdo_ministerial', 'No. de acuerdo ministerial'],
  ['fecha_aprobacion_acuerdo', 'Fecha de aprobación del acuerdo ministerial', 'date'],
  ['codigo_siges', 'Código SIGES'],
  ['codigo_sicoin', 'Código SICOIN'],
  ['cur', 'Código único de registro (CUR)'],
  ['fecha_entrega', 'Fecha de entrega de la donación', 'date']
]

export const limpiarNombreOng = (nombre) => String(nombre ?? '').trim().replace(/\s+/g, ' ')
export const claveNombreOng = (nombre) => limpiarNombreOng(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
