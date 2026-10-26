import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'node:url'
import { prepararFilasDescargo } from '../src/main/modules/inventario/descargo.formato.js'

const ruta = fileURLToPath(new URL('../resources/DescargoHospital.xlsx', import.meta.url))
for (const cantidad of [0, 4, 25, 26, 181, 230]) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  const hoja = wb.getWorksheet('DESCARGO AGOSTO 2026 ')
  const encabezado = structuredClone(hoja.getRow(1).values)
  const modelos = [2, 3].map((r) => ({
    altura: hoja.getRow(r).height,
    estilos: Array.from({ length: 32 }, (_, i) => structuredClone(hoja.getCell(r, i + 1).style))
  }))
  const lineas = prepararFilasDescargo(hoja, cantidad)
  assert.equal(lineas, Math.max(25, cantidad))
  // Simular la escritura de valores del reporte, incluidos los resultados calculados.
  for (let i = 0; i < cantidad; i++) {
    hoja.getCell(i + 2, 1).value = i + 1
    hoja.getCell(i + 2, 2).value = `Producto ${i + 1}`
    hoja.getCell(i + 2, 32).value = 15
  }
  const salida = new ExcelJS.Workbook()
  await salida.xlsx.load(await wb.xlsx.writeBuffer())
  const s = salida.worksheets[0]
  assert.deepEqual(s.getRow(1).values, encabezado)
  assert.equal(s.pageSetup.printArea, `A1:AF${lineas + 1}`)
  for (let r = 2; r <= lineas + 1; r++) {
    const modelo = modelos[r % 2]
    assert.equal(s.getRow(r).height, modelo.altura)
    for (let c = 1; c <= 32; c++) {
      assert.deepEqual(s.getCell(r, c).style, modelo.estilos[c - 1], `Patrón original en fila ${r}, columna ${c}`)
      if (r > cantidad + 1) assert.equal(s.getCell(r, c).value, null)
    }
  }
  for (let r = lineas + 2; r <= s.rowCount; r++) {
    assert.ok(!s.getRow(r).hasValues, `No debe haber valores en fila sobrante ${r}`)
  }
  console.log(`OK: ${cantidad} registros, ${lineas} líneas con patrón 2/3 y resto sin valores ni formato.`)
}
