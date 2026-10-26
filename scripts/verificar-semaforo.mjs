// No requiere Electron: verifica el formato y XML de impresión con la plantilla real.
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { fileURLToPath } from 'node:url'
import { prepararSemaforo } from '../src/main/modules/inventario/semaforo.formato.js'

const plantilla = fileURLToPath(new URL('../resources/Inventario Fisico Semaforo.xlsx', import.meta.url))
for (const cantidad of [0, 4, 10, 11, 24, 25, 45, 46, 59, 60, 80, 81, 94, 113, 114, 148, 149, 218]) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(plantilla)
  const original = wb.getWorksheet('SEMAFORO')
  const firmaIzquierda = original.getCell('B128').value
  const firmaDerecha = original.getCell('F128').value
  const estiloContinuacion = structuredClone(original.getCell('B65').style)
  const imagenes = original.getImages().length
  // Simular datos de ejemplo que deben desaparecer incluso si la exportación es vacía.
  original.getCell('B118').value = 'EJEMPLO QUE NO DEBE EXPORTARSE'
  const datos = Array.from({ length: cantidad }, (_, i) => ({
    descripcion_completa: `Producto ${i + 1}`, cantidad_unitaria: 'Caja de 50', numero_lote: `L-${i + 1}`,
    fecha_vencimiento: i % 2 ? '2040-01-01' : '2020-01-01', numero_kardex: `000${i + 1}`,
    saldo_lote: 2, precio_unitario: 3.5
  }))
  const layout = prepararSemaforo(wb, datos, { fechaHasta: '2026-10-26' })
  const paginas = 1 + Math.max(0, Math.ceil((cantidad - 10) / 35))
  const copias = Math.max(0, paginas - 3)
  const finEsperado = 29 + (paginas - 1) * 35
  const desplazamiento = layout.filaTotal - 119
  assert.equal(layout.copias, copias)
  assert.equal(layout.paginas, paginas)
  if (cantidad <= 10) {
    assert.equal(layout.filaTotal, 16, 'Se reservan total y firmas dentro de las filas 1 a 29')
    assert.deepEqual(layout.cortes, [], 'No se crea una página extra de cierre')
  }
  assert.equal(layout.filaTotal, finEsperado - 13)
  assert.equal(layout.finImpresion, finEsperado)
  assert.equal(layout.filasDatos.length, cantidad)
  assert.ok(layout.filasDatos.every((fila) => fila < layout.filaTotal))
  const buffer = await wb.xlsx.writeBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file(`xl/worksheets/sheet${original.id}.xml`).async('string')
  const cortes = [...xml.matchAll(/<brk\b[^>]*id="(\d+)"[^>]*\/>/g)].map((m) => Number(m[1]))
  assert.deepEqual(cortes, layout.cortes)
  assert.ok(!xml.includes('EJEMPLO QUE NO DEBE EXPORTARSE'))
  const workbookXml = await zip.file('xl/workbook.xml').async('string')
  assert.ok(workbookXml.includes(`$A1:$I${layout.finImpresion}`))
  const salida = new ExcelJS.Workbook()
  await salida.xlsx.load(buffer)
  const s = salida.getWorksheet('SEMAFORO')
  assert.equal(s.getImages().length, imagenes)
  assert.equal(s.getCell(`B${128 + desplazamiento}`).value, firmaIzquierda)
  assert.equal(s.getCell(`F${128 + desplazamiento}`).value, firmaDerecha)
  assert.ok(s.model.merges.includes(`B${128 + desplazamiento}:B${129 + desplazamiento}`))
  assert.ok(s.model.merges.includes(`F${128 + desplazamiento}:H${129 + desplazamiento}`))
  assert.ok(s.model.merges.includes(`A${layout.filaTotal}:B${layout.filaTotal}`))
  assert.equal(s.getCell(layout.filaTotal, 7).value, cantidad * 2)
  assert.equal(s.getCell(layout.filaTotal, 9).value, cantidad * 7)
  assert.equal(s.getCell('B1').value.split('\n').at(-1), 'Inventario Físico Semáforo al 26 de octubre de 2026')
  assert.equal(s.pageSetup.orientation, 'landscape')
  assert.equal(s.pageSetup.fitToPage, false)
  assert.equal(s.headerFooter.oddFooter, '&RPágina &P de &N')
  assert.equal(s.getCell('B5').value.trim(), 'Descripción')
  for (let i = 0; i < cantidad; i++) {
    assert.equal(s.getCell(layout.filasDatos[i], 1).value, i + 1)
    assert.equal(s.getCell(layout.filasDatos[i], 2).value, `Producto ${i + 1}`)
  }
  const ocupadas = new Set(layout.filasDatos)
  for (let fila = 6; fila < layout.filaTotal; fila++) {
    if (!ocupadas.has(fila)) {
      assert.equal(s.getCell(fila, 2).value, null)
      assert.ok(s.getCell(fila, 2).border.bottom, 'Los espacios libres del bloque utilizado conservan sus bordes')
    }
  }
  for (let fila = layout.finImpresion + 1; fila <= Math.max(132, s.rowCount); fila++) {
    for (let col = 1; col <= 9; col++) {
      const celda = s.getCell(fila, col)
      assert.equal(celda.value, null, 'Sin datos fuera del último bloque utilizado')
      assert.equal(Object.keys(celda.border || {}).length, 0, `Sin bordes en la fila ${fila} de los bloques no utilizados`)
    }
  }
  if (cantidad === 4) {
    for (let fila = 10; fila <= 15; fila++) assert.equal(s.getCell(fila, 2).value, null)
    assert.equal(s.getCell('G16').value, 8)
    assert.equal(s.getCell('B25').value, firmaIzquierda)
  }
  if (cantidad) assert.equal(s.getCell('B6').fill.fgColor.argb, 'FFFF0000')
  if (copias) {
    assert.deepEqual(s.getCell('B100').font, estiloContinuacion.font)
    assert.deepEqual(s.getCell('B100').border, estiloContinuacion.border)
    assert.equal(s.getRow(100).height, s.getRow(65).height)
  }
  console.log(`OK: ${cantidad} registros, ${layout.paginas} bloques/páginas, ${copias} copias del bloque 3, firmas y totales conservados.`)
}
