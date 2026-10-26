import { app } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { prepararSemaforo } from './semaforo.formato.js'

const NOMBRE_PLANTILLA = 'Inventario Fisico Semaforo.xlsx'

function rutaPlantilla() {
  const candidatas = []
  if (app.isPackaged) {
    candidatas.push(join(process.resourcesPath, 'app.asar.unpacked', 'resources', NOMBRE_PLANTILLA))
    candidatas.push(join(process.resourcesPath, NOMBRE_PLANTILLA))
  }
  candidatas.push(join(app.getAppPath(), 'resources', NOMBRE_PLANTILLA))
  return candidatas.find((r) => existsSync(r)) || candidatas[candidatas.length - 1]
}

export async function generarReporteSemaforo(datos, filtros = {}) {
  const ruta = rutaPlantilla()
  if (!existsSync(ruta)) throw new Error('No se encontró la plantilla del reporte en resources.')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  prepararSemaforo(wb, datos, filtros)
  return Buffer.from(await wb.xlsx.writeBuffer())
}
