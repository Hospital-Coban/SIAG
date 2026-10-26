import ExcelJS from 'exceljs'
import { estilizarReporte } from './reporte.estilo.js'

const fechaExcel = (f) => f ? new Date(`${String(f).slice(0, 10)}T00:00:00Z`) : null

export async function generarExcelInventario({ tipo, datos, config = {}, desde = '', hasta = '' }) {
  const libro = new ExcelJS.Workbook()
  const tarjeta = tipo === 'tarjeta'
  const filaCabecera = tarjeta ? 9 : 5
  const hoja = libro.addWorksheet(tarjeta ? 'Kardex' : 'Ingresos', { views: [{ state: 'frozen', ySplit: filaCabecera }] })
  const titulo = (texto, fila, ultima) => { hoja.getCell(`A${fila}`).value = texto; hoja.mergeCells(`A${fila}:${ultima}${fila}`) }
  let encabezados, filas
  if (tarjeta) {
    const t = datos
    encabezados = ['Fecha', 'No. referencia', 'Remitente / destinatario', 'Entrada cantidad', 'Precio unitario', 'Valor entrada', 'Fecha vencimiento', 'Número lote', 'Salida cantidad', 'Reajuste (+/-)', 'Saldo cantidad', 'Saldo valor Q', 'Observaciones']
    titulo(config.institucion || '', 1, 'M')
    titulo('TARJETA DE CONTROL DE SUMINISTROS', 2, 'M')
    titulo(`U.E.: ${config.ue || ''} · Municipio: ${config.municipio || ''} · Distrito: ${config.distrito || ''} · Servicio: ${config.servicio || ''}`, 3, 'M')
    titulo(`${t.suministro.codigo_producto} — ${t.suministro.descripcion_completa} — ${t.suministro.cantidad_unitaria}`, 4, 'M')
    titulo(`Tarjeta: ${t.suministro.numero_tarjeta || ''} · Mínimo: ${t.suministro.minimo ?? ''} · Máximo: ${t.suministro.maximo ?? ''}`, 5, 'M')
    titulo(`${config.direccion || ''} · ${config.telefono || ''}`, 6, 'M')
    const previos = t.movimientos.filter((m) => desde && m.fecha_movimiento.slice(0, 10) < desde)
    const anterior = previos.at(-1)
    titulo(`Periodo: ${desde || 'Inicio'} a ${hasta || 'Actual'} · Saldo anterior: ${anterior?.saldo || 0} · Valor anterior Q ${anterior?.valor_saldo || 0}`, 7, 'M')
    filas = t.movimientos.filter((m) => (!desde || m.fecha_movimiento.slice(0, 10) >= desde) && (!hasta || m.fecha_movimiento.slice(0, 10) <= hasta)).map((m) => {
      const entrada = m.tipo_movimiento.startsWith('Entrada')
      return [fechaExcel(m.fecha_movimiento), m.documento_referencia, m.destino || m.nombre_razon_social,
        entrada ? m.cantidad : null, entrada ? m.precio_unitario : null, entrada ? m.cantidad * m.precio_unitario : null,
        fechaExcel(m.fecha_vencimiento), m.numero_lote, m.tipo_movimiento === 'Salida' ? -m.cantidad : null,
        m.tipo_movimiento === 'Reajuste' ? m.cantidad : null, m.saldo, m.valor_saldo, [...new Set([m.observaciones_documento, m.observaciones].filter(Boolean))].join(' · ')]
    })
  } else {
    encabezados = ['No. de factura y/o forma de traslado', 'NIT del proveedor', 'Nombre del proveedor', 'No. código del producto / presentación', 'Descripción del producto', 'Cantidad ingresada', 'Costo unitario', 'Costo total', 'Fecha de ingreso', 'Modalidad de compra', 'Cantidad unitaria por presentación', 'Observaciones']
    titulo(config.institucion || '', 1, 'L')
    titulo(config.unidad || 'Control de ingreso de medicamentos y productos afines', 2, 'L')
    titulo(`Periodo: ${desde || 'Inicio'} a ${hasta || 'Actual'}`, 3, 'L')
    filas = datos.filter((r) => r.tipo.startsWith('Entrada') && (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta)).map((r) => [r.referencia, r.nit_entidad, r.nombre_razon_social, r.codigo_producto, r.descripcion_completa, r.cantidad, r.precio_unitario, r.precio_unitario * r.cantidad, fechaExcel(r.fecha), r.modalidad || '', r.cantidad_unitaria, [r.observaciones, r.observaciones_producto].filter(Boolean).join(' · ')])
  }
  hoja.addTable({ name: tarjeta ? 'TablaKardex' : 'TablaIngresos', ref: `A${filaCabecera}`, headerRow: true, style: { theme: 'TableStyleMedium2', showRowStripes: true }, columns: encabezados.map((name) => ({ name, filterButton: true })), rows: filas })
  hoja.columns.forEach((c, i) => { c.width = i === 2 || i === 4 || i === encabezados.length - 1 ? 36 : 21 })
  hoja.getRow(filaCabecera).height = 50
  hoja.eachRow((row, n) => row.eachCell((cell, col) => {
    cell.alignment = { vertical: 'middle', wrapText: true }
    if (n === filaCabecera) { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } }
    if (n > filaCabecera && cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy'
    if (n > filaCabecera && (tarjeta ? [5, 6, 12] : [7, 8]).includes(col)) cell.numFmt = '"Q" #,##0.00'
  }))
  hoja.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `1:${filaCabecera}` }
  estilizarReporte(hoja, {
    cabecera: filaCabecera,
    columnas: encabezados.length,
    monetarias: tarjeta ? [5, 6, 12] : [7, 8],
    cantidades: tarjeta ? [4, 9, 10, 11] : [6]
  })
  if (tarjeta) {
    hoja.getColumn(1).width = 15
    hoja.getColumn(7).width = 15
    hoja.getColumn(3).width = 35
    hoja.getColumn(13).width = 45
    hoja.getRow(4).height = 40
  }
  return libro.xlsx.writeBuffer()
}
