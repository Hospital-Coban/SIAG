import { app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { prepararFilasDescargo } from './descargo.formato.js'
import {
  MUNICIPIOS,
  COL_OTROS,
  claveMunicipio,
  indiceMunicipio,
  tituloHoja
} from './descargo.datos.js'

const NOMBRE_PLANTILLA = 'DescargoHospital.xlsx'
const HOJA_PLANTILLA = 'DESCARGO AGOSTO 2026 '

const FILA_INICIO_DATOS = 2

// Índices (base 0) de cada columna de la plantilla.
const COL = {
  no: 0,
  suministro: 1,
  kardex: 2,
  saldoInicial: 3,
  ingresos: 4,
  municipioInicio: 5, // F
  otros: 24, // Y
  salidas: 25, // Z
  saldoFisico: 26, // AA
  numeroLote: 27, // AB
  fechaVenc: 28, // AC
  noKardex: 29, // AD
  precioUnitario: 30, // AE
  precioTotal: 31 // AF
}

function rutaPlantilla() {
  const candidatas = []
  if (app.isPackaged) {
    candidatas.push(join(process.resourcesPath, 'app.asar.unpacked', 'resources', NOMBRE_PLANTILLA))
    candidatas.push(join(process.resourcesPath, NOMBRE_PLANTILLA))
  }
  candidatas.push(join(app.getAppPath(), 'resources', NOMBRE_PLANTILLA))
  return candidatas.find((r) => existsSync(r)) || candidatas[candidatas.length - 1]
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = `${fechaStr}`.slice(0, 10).split('-')
  if (!y || !m || !d) return `${fechaStr}`
  return `${d}/${m}/${y}`
}

// Renombra la hoja al mes/año elegidos y devuelve el nombre nuevo.
function renombrarHoja(hoja, mes, anio) {
  const nombre = tituloHoja({ mes, anio })
  if (hoja.name !== nombre) hoja.name = nombre
  return nombre
}

function celda(hoja, fila, col) {
  return hoja.getCell(fila, col + 1)
}

function escribir(hoja, fila, col, valor) {
  const c = celda(hoja, fila, col)
  c.value = valor
  return c
}

export async function generarReporteDescargo(datos, { mes, anio } = {}) {
  const ruta = rutaPlantilla()
  if (!existsSync(ruta)) {
    throw new Error('No se encontró la plantilla del descargo en resources.')
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  const hoja = wb.getWorksheet(HOJA_PLANTILLA)
  if (!hoja) throw new Error(`La plantilla no contiene la hoja "${HOJA_PLANTILLA}".`)

  renombrarHoja(hoja, mes, anio)

  const indice = indiceMunicipio()
  const colPorDestino = new Map()
  MUNICIPIOS.forEach((m, i) => colPorDestino.set(claveMunicipio(m), COL.municipioInicio + i))
  colPorDestino.set(claveMunicipio(COL_OTROS), COL.otros)

  // Mínimo 25 líneas, patrón par/impar constante y limpieza total fuera del rango.
  prepararFilasDescargo(hoja, datos.length)

  datos.forEach((dato, i) => {
    const fila = FILA_INICIO_DATOS + i

    escribir(hoja, fila, COL.no, i + 1)
    escribir(hoja, fila, COL.suministro, dato.descripcion_completa || '')
    escribir(hoja, fila, COL.kardex, dato.ultimo_kardex || '')
    escribir(hoja, fila, COL.saldoInicial, dato.saldo_inicial || 0)
    escribir(hoja, fila, COL.ingresos, dato.ingresos || 0)

    // Las columnas de municipio son SALIDAS; lo que no caiga en un municipio
    // conocido se acumula en OTROS para que nada se pierda del total.
    const porColumna = new Map()
    let totalPorDestino = 0

    for (const [destino, cantidad] of dato.salidas_por_destino || new Map()) {
      const clave = claveMunicipio(destino)
      const col = colPorDestino.get(clave) ?? COL.otros
      porColumna.set(col, (porColumna.get(col) || 0) + cantidad)
      totalPorDestino += cantidad
    }

    for (let col = COL.municipioInicio; col <= COL.otros; col++) {
      escribir(hoja, fila, col, porColumna.get(col) || 0)
    }

    escribir(hoja, fila, COL.salidas, totalPorDestino)
    escribir(hoja, fila, COL.saldoFisico, dato.saldo_fisico || 0)
    escribir(hoja, fila, COL.numeroLote, (dato.lotes || []).join(', '))
    escribir(hoja, fila, COL.fechaVenc, (dato.vencimientos || []).filter(Boolean).map(formatearFecha).join(', '))
    escribir(hoja, fila, COL.noKardex, dato.ultimo_kardex || '')
    escribir(hoja, fila, COL.precioUnitario, dato.precio_unitario || 0)
    escribir(hoja, fila, COL.precioTotal, (dato.saldo_fisico || 0) * (dato.precio_unitario || 0))
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}

export { COL as COLUMNAS_DESCARGO }
