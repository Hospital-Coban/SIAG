import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { DonacionesService } from './donaciones.service.js'

export function registrarDonacionesIpc(db) {
  const service = new DonacionesService(db)
  ipcMain.handle(CANALES.DONACIONES_ONG_LISTAR, async () => {
    try {
      return { ok: true, data: service.listarOng() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar ONG donantes') }
    }
  })
  ipcMain.handle(CANALES.DONACIONES_CREAR, async (_event, datos) => {
    try {
      return { ok: true, data: service.crear(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar donación') }
    }
  })

  ipcMain.handle(CANALES.DONACIONES_LISTAR, async () => {
    try {
      return { ok: true, data: service.listar() }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar expedientes de donación') }
    }
  })

  ipcMain.handle(CANALES.DONACIONES_OBTENER, async (_event, id) => {
    try {
      return { ok: true, data: service.obtener(id) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Ver expediente de donación') }
    }
  })

  ipcMain.handle(CANALES.DONACIONES_ACTUALIZAR, async (_event, id, datos) => {
    try {
      return { ok: true, data: service.actualizar(id, datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Actualizar expediente de donación') }
    }
  })

  ipcMain.handle(CANALES.DONACIONES_ELIMINAR, async (_event, id) => {
    try {
      return { ok: true, data: service.eliminar(id) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Eliminar expediente de donación') }
    }
  })

  ipcMain.handle(CANALES.DONACIONES_EXPORTAR_EXCEL, async (event, buffer, nombreBase) => {
    try {
      const ventana = BrowserWindow.fromWebContents(event.sender)
      const nombre = nombreBase || `donaciones_${new Date().toISOString().slice(0, 10)}.xlsx`
      const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
        title: 'Exportar donaciones a Excel',
        defaultPath: nombre,
        buttonLabel: 'Exportar',
        filters: [
          { name: 'Libro de Excel', extensions: ['xlsx'] }
        ]
      })

      if (canceled || !filePath) {
        return { ok: true, data: { cancelado: true } }
      }

      fs.writeFileSync(filePath, Buffer.from(buffer))
      return { ok: true, data: { cancelado: false, ruta: filePath } }
    } catch (err) {
      return { ok: false, error: `No se pudo exportar el archivo: ${err.message}` }
    }
  })
}
