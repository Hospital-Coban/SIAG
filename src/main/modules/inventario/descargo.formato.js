// La pareja de filas 2/3 es el patrón canónico, incluso después de la fila 180.
export function prepararFilasDescargo(hoja, cantidad) {
  const necesarias = Math.max(25, cantidad)
  const ultima = Math.max(hoja.rowCount, necesarias + 1)
  const modelos = [2, 3].map((numero) => {
    const fila = hoja.getRow(numero)
    return {
      altura: fila.height,
      estilo: structuredClone(fila.style),
      celdas: Array.from({ length: 32 }, (_, i) => structuredClone(fila.getCell(i + 1).style))
    }
  })
  for (let numero = 2; numero <= ultima; numero++) {
    const fila = hoja.getRow(numero)
    const modelo = numero <= necesarias + 1 ? modelos[(numero - 2) % 2] : null
    fila.style = modelo ? structuredClone(modelo.estilo) : {}
    fila.height = modelo?.altura
    fila.hidden = false
    // Limpiar también los valores y las fórmulas compartidas sin intentar resolverlas.
    fila.eachCell({ includeEmpty: true }, (celda) => { celda.value = null; celda.style = {} })
    for (let col = 1; col <= 32; col++) {
      const celda = fila.getCell(col)
      celda.value = null
      celda.style = modelo ? structuredClone(modelo.celdas[col - 1]) : {}
    }
  }
  // La plantilla contiene filas preformateadas. Eliminarlas evita que ExcelJS
  // conserve estilos residuales debajo de la última línea de la tabla.
  const primeraSobrante = necesarias + 2
  if (hoja.rowCount >= primeraSobrante) {
    hoja.spliceRows(primeraSobrante, hoja.rowCount - primeraSobrante + 1)
  }
  hoja.pageSetup.printArea = `A1:AF${necesarias + 1}`
  return necesarias
}
