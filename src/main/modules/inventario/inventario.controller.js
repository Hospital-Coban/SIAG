import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { InventarioService } from './inventario.service.js'
import { generarReporteSemaforo } from './semaforo.excel.js'
import { generarReporteDescargo } from './descargo.excel.js'
import { datosDescargo, nombreArchivoDescargo } from './descargo.datos.js'

export function registrarInventarioIpc(db) {
  const service = new InventarioService(db)
  ipcMain.handle(CANALES.INVENTARIO_EXPORTAR_ARCHIVO, async (event, buffer, nombre) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
        title: 'Exportar reporte de inventario', defaultPath: nombre || 'Inventario.xlsx',
        buttonLabel: 'Exportar', filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return { ok: true, data: { cancelado: true } }
      fs.writeFileSync(filePath, Buffer.from(buffer))
      return { ok: true, data: { ruta: filePath, cancelado: false } }
    } catch (err) {
      return { ok: false, error: `No se pudo exportar el reporte: ${err.message}` }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_SALDO, async () => {
    try {
      return { ok: true, data: service.saldo() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Consultar saldo') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_LOTES_LISTAR, async (_event, id_suministro) => {
    try {
      return { ok: true, data: service.listarLotes(id_suministro) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar lotes') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_PROXIMOS_VENCER, async (_event, dias) => {
    try {
      return { ok: true, data: service.proximosVencer(dias ?? 90) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Consultar vencimientos') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_REPORTE, async (_event, filtros) => {
    try {
      return { ok: true, data: service.reporteInventario(filtros ?? {}) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Generar reporte de inventario') }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_EXPORTAR_SEMAFORO, async (event, args) => {
    try {
      const datos = args?.datos?.length ? args.datos : service.reporteInventario(args?.filtros ?? {})
      const buffer = await generarReporteSemaforo(datos, args?.filtros ?? {})
      const ventana = BrowserWindow.fromWebContents(event.sender)
      const fecha = new Date().toISOString().slice(0, 10)
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Exportar Inventario Físico Semáforo',
        defaultPath: `InventarioFisicoSemaforo_${fecha}.xlsx`,
        buttonLabel: 'Exportar',
        filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }]
      })

      if (canceled || !filePath) {
        return { ok: true, data: { cancelado: true } }
      }

      fs.writeFileSync(filePath, buffer)
      return { ok: true, data: { cancelado: false, ruta: filePath } }
    } catch (err) {
      return { ok: false, error: `No se pudo exportar el reporte: ${err.message}` }
    }
  })

  ipcMain.handle(CANALES.INVENTARIO_EXPORTAR_DESCARGO, async (event, args) => {
    try {
      const mes = Number(args?.mes)
      const anio = Number(args?.anio)
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { ok: false, error: 'Mes inválido.' }
      }
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        return { ok: false, error: 'Año inválido.' }
      }

      const datos = datosDescargo(db, { mes, anio })
      const buffer = await generarReporteDescargo(datos, { mes, anio })

      const ventana = BrowserWindow.fromWebContents(event.sender)
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Exportar Descargo Mensual',
        defaultPath: nombreArchivoDescargo({ mes, anio }),
        buttonLabel: 'Exportar',
        filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }]
      })

      if (canceled || !filePath) {
        return { ok: true, data: { cancelado: true } }
      }

      fs.writeFileSync(filePath, buffer)
      return { ok: true, data: { cancelado: false, ruta: filePath, filas: datos.length } }
    } catch (err) {
      return { ok: false, error: `No se pudo exportar el descargo: ${err.message}` }
    }
  })
}
