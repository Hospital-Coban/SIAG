import { estadoVencimiento } from '../../../shared/semaforo.js'

// Los dos primeros cortes son los manuales de la plantilla. El tercero se hace
// explícito con 35 filas de continuación (igual al bloque 2), sin depender de la impresora.
export const BLOQUES_SEMAFORO = {
  finPrimero: 29,
  finSegundo: 64,
  inicioTercero: 65,
  finTercero: 99,
  inicioCierre: 100,
  filaTotal: 119,
  finCierre: 132,
  inicioDatos: 6
}
const COLORES = { verde: 'FF92D050', amarillo: 'FFFFFF00', rojo: 'FFFF0000' }
const MONEDA = '"Q" #,##0.00'
const copiar = (v) => structuredClone(v)

function capturarFila(hoja, numero) {
  const fila = hoja.getRow(numero)
  return {
    height: fila.height, hidden: fila.hidden, style: copiar(fila.style),
    celdas: Array.from({ length: 9 }, (_, i) => {
      const c = fila.getCell(i + 1)
      return { value: c.type === 1 ? null : copiar(c.value), style: copiar(c.style) }
    })
  }
}

function pegarFila(hoja, numero, original) {
  const fila = hoja.getRow(numero)
  fila.height = original.height
  fila.hidden = original.hidden
  fila.style = copiar(original.style)
  original.celdas.forEach((c, i) => {
    fila.getCell(i + 1).value = copiar(c.value)
    fila.getCell(i + 1).style = copiar(c.style)
  })
}

function fechaTexto(fecha) {
  const [y, m, d] = String(fecha || '').slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

function titulo(fechaHasta) {
  const hoy = new Date()
  const fecha = fechaHasta || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const [y, m, d] = fecha.slice(0, 10).split('-')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return [
    'Dirección Departamental de Redes Integradas de Servicios de Salud de Alta Verapaz',
    'Almacén de Material Médico Quirúrgico',
    `Inventario Físico Semáforo al ${Number(d)} de ${meses[Number(m) - 1]} de ${y}`
  ].join('\n')
}

function escribirDato(hoja, numero, dato, indice) {
  const color = COLORES[estadoVencimiento(dato.fecha_vencimiento)]
  const valores = [indice, dato.descripcion_completa || '', dato.cantidad_unitaria || '',
    dato.numero_lote || '', fechaTexto(dato.fecha_vencimiento), dato.numero_kardex || '',
    dato.saldo_lote || 0, dato.precio_unitario || 0, (dato.saldo_lote || 0) * (dato.precio_unitario || 0)]
  valores.forEach((valor, i) => {
    const celda = hoja.getCell(numero, i + 1)
    celda.value = valor
    celda.style = {
      ...copiar(celda.style),
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
      alignment: { ...celda.alignment, vertical: 'middle' }
    }
    if (i === 7 || i === 8) celda.numFmt = MONEDA
  })
}

export function prepararSemaforo(wb, datos, { fechaHasta } = {}) {
  const hoja = wb.getWorksheet('SEMAFORO')
  if (!hoja) throw new Error('La plantilla no contiene la hoja SEMAFORO.')
  const b = BLOQUES_SEMAFORO
  const filasPorCopia = b.finTercero - b.inicioTercero + 1
  const capacidadPrimero = b.finPrimero - b.inicioDatos + 1
  const finOriginal = Math.max(b.finCierre, hoja.rowCount)
  const filasCierre = finOriginal - b.filaTotal + 1
  // Reservar primero el cierre dentro del último bloque; el resto son espacios de productos.
  const continuaciones = Math.max(0, Math.ceil((datos.length + filasCierre - capacidadPrimero) / filasPorCopia))
  const paginas = continuaciones + 1
  const copias = Math.max(0, paginas - 3)
  const finImpresion = b.finPrimero + continuaciones * filasPorCopia
  const filaTotal = finImpresion - filasCierre + 1
  const espaciosDatos = filaTotal - b.inicioDatos
  const desplazamiento = filaTotal - b.filaTotal

  // Capturar antes de reconstruir y desmontar las combinaciones para reubicar el cierre.
  const estilosDatos = Array.from({ length: b.finTercero - b.inicioDatos + 1 }, (_, i) => capturarFila(hoja, b.inicioDatos + i))
  const cierre = Array.from({ length: finOriginal - b.filaTotal + 1 }, (_, i) => capturarFila(hoja, b.filaTotal + i))
  const combinacionesCierre = hoja.model.merges.filter((rango) => Number(rango.match(/\d+/)[0]) >= b.inicioDatos)
  combinacionesCierre.forEach((rango) => hoja.unMergeCells(rango))
  // spliceRows conserva estilos de filas eliminadas: limpiarlos explícitamente para
  // que los bloques no utilizados tampoco muestren bordes al abrir el Excel.
  for (let numero = b.inicioDatos; numero <= finOriginal; numero++) {
    const fila = hoja.getRow(numero)
    fila.style = {}
    fila.height = undefined
    fila.hidden = false
    for (let col = 1; col <= 9; col++) {
      fila.getCell(col).value = null
      fila.getCell(col).style = {}
    }
  }
  for (let i = 0; i < espaciosDatos; i++) {
    const origen = i < estilosDatos.length ? i : b.inicioTercero - b.inicioDatos + (i - estilosDatos.length) % filasPorCopia
    pegarFila(hoja, b.inicioDatos + i, estilosDatos[origen])
  }
  cierre.forEach((fila, i) => pegarFila(hoja, filaTotal + i, fila))
  combinacionesCierre.forEach((rango) => hoja.mergeCells(rango.replace(/\d+/g, (n) => String(Number(n) + desplazamiento))))

  // Solo los registros de la consulta: ningún ejemplo o fórmula vieja queda en los espacios libres.
  for (let fila = b.inicioDatos; fila < filaTotal; fila++) {
    for (let col = 1; col <= 9; col++) hoja.getCell(fila, col).value = null
  }
  const filasDatos = []
  let indice = 0
  for (let pagina = 0; pagina < paginas; pagina++) {
    const inicio = pagina === 0 ? b.inicioDatos : b.finPrimero + (pagina - 1) * filasPorCopia + 1
    const fin = pagina === paginas - 1 ? filaTotal - 1 : b.finPrimero + pagina * filasPorCopia
    // Si hay continuación, conservar al menos un registro en el bloque final.
    const cantidad = Math.min(fin - inicio + 1, datos.length - indice - (pagina < paginas - 1 ? 1 : 0))
    for (let j = 0; j < Math.max(0, cantidad); j++) {
      const fila = inicio + j
      escribirDato(hoja, fila, datos[indice], indice + 1)
      filasDatos.push(fila)
      indice++
    }
  }
  hoja.getCell('B1').value = titulo(fechaHasta)
  hoja.getCell(filaTotal, 7).value = datos.reduce((a, d) => a + Number(d.saldo_lote || 0), 0)
  hoja.getCell(filaTotal, 9).value = datos.reduce((a, d) => a + Number(d.saldo_lote || 0) * Number(d.precio_unitario || 0), 0)
  hoja.getCell(filaTotal, 9).numFmt = MONEDA

  const cortes = Array.from({ length: continuaciones }, (_, i) => b.finPrimero + i * filasPorCopia)

  // Escala fija + cortes manuales: "ajustar a N páginas" puede ignorar los cortes.
  // Se limita también por altura para no partir el bloque de cierre ni sus firmas.
  const margenes = hoja.pageSetup.margins
  const papel = hoja.pageSetup.paperSize || 1 // Carta horizontal si la plantilla no especifica papel.
  const altoPapel = papel === 9 ? 595.28 : 612
  const altoUtil = altoPapel - ((margenes?.top || 0) + (margenes?.bottom || 0)) * 72 - 8
  const alturaFilas = (inicio, fin) => {
    let altura = 0
    for (let fila = inicio; fila <= fin; fila++) altura += hoja.getRow(fila).height ?? hoja.properties.defaultRowHeight ?? 18.75
    return altura
  }
  hoja.rowBreaks = []
  cortes.forEach((fila) => hoja.getRow(fila).addPageBreak(1, 9))
  const inicios = [1, ...cortes.map((n) => n + 1)]
  const finales = [...cortes, finImpresion]
  const alturas = inicios.map((inicio, i) => {
    return alturaFilas(inicio, finales[i])
  })
  hoja.pageSetup = {
    ...hoja.pageSetup, orientation: 'landscape', paperSize: papel,
    fitToPage: false, scale: Math.min(hoja.pageSetup.scale || 70, Math.floor(altoUtil / Math.max(...alturas) * 100)),
    printArea: `A1:I${finImpresion}`, printTitlesRow: undefined, printTitlesColumn: undefined,
    blackAndWhite: false
  }
  hoja.headerFooter = { ...hoja.headerFooter, oddFooter: '&RPágina &P de &N' }
  hoja.autoFilter = `A5:I${Math.max(5, filaTotal - 1)}`
  return { copias, filaTotal, finImpresion, cortes, paginas, filasDatos }
}
