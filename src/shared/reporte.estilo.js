// Presentación común de los reportes generados sin plantilla oficial.
export function estilizarReporte(hoja, { cabecera, columnas, monetarias = [], cantidades = [] }) {
  hoja.views = [{ state: 'frozen', ySplit: cabecera, showGridLines: false }]
  for (let n = 1; n < cabecera; n++) {
    const fila = hoja.getRow(n)
    fila.height = n <= 2 ? 30 : 26
    fila.eachCell((c) => {
      c.font = { name: 'Calibri', size: n === 2 ? 16 : 11, bold: n <= 2, color: { argb: n <= 2 ? 'FFFFFFFF' : 'FF334155' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: n <= 2 ? 'FF1E3A5F' : 'FFEFF6FF' } }
      c.alignment = { vertical: 'middle', wrapText: true }
    })
  }
  hoja.getRow(cabecera).height = 54
  for (let n = cabecera; n <= hoja.rowCount; n++) {
    const fila = hoja.getRow(n)
    if (n > cabecera) fila.height = 42
    for (let col = 1; col <= columnas; col++) {
      const c = fila.getCell(col)
      c.font = { name: 'Calibri', size: 11, bold: n === cabecera, color: { argb: n === cabecera ? 'FFFFFFFF' : 'FF0F172A' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: n === cabecera ? 'FF1F4E78' : (n - cabecera) % 2 ? 'FFFFFFFF' : 'FFEFF6FF' } }
      c.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } }
      c.alignment = { vertical: 'middle', wrapText: true, horizontal: n === cabecera ? 'center' : monetarias.includes(col) || cantidades.includes(col) ? 'right' : 'left' }
      if (n > cabecera) {
        if (c.value instanceof Date) c.numFmt = 'dd/mm/yyyy'
        if (monetarias.includes(col)) c.numFmt = '"Q" #,##0.00;[Red]("Q" #,##0.00)'
        if (cantidades.includes(col)) c.numFmt = '#,##0;[Red](#,##0)'
      }
    }
  }
  hoja.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `1:${cabecera}`, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } }
  hoja.pageSetup.printArea = `A1:${hoja.getColumn(columnas).letter}${hoja.rowCount}`
  hoja.headerFooter.oddFooter = '&LSIAG Almacén&R Página &P de &N'
}
