import { ipcMain } from 'electron'
import { CANALES } from '../../../shared/ipc.js'
import { mensajeErrorSql } from '../../utils/errores.js'
import { KardexService } from './kardex.service.js'
import { DocumentosService } from './documentos.service.js'

export function registrarKardexIpc(db) {
  const service = new KardexService(db)
  const documentos = new DocumentosService(db)
  ipcMain.handle(CANALES.INVENTARIO_DOCUMENTOS, async (_event, accion, datos) => {
    try {
      let data
      if (accion === 'catalogos') data = documentos.catalogos()
      else if (accion === 'crearCatalogo') data = documentos.crearCatalogo(datos.tipo, datos)
      else if (accion === 'previsualizar') data = documentos.previsualizar(datos)
      else if (accion === 'guardar') data = documentos.guardar(datos)
      else if (accion === 'reajustar') data = documentos.reajustar(datos)
      else if (accion === 'reporte') data = documentos.reporte()
      else if (accion === 'tarjeta') data = documentos.tarjeta(datos.id_suministro)
      else if (accion === 'configurar') data = documentos.configurar(datos)
      else throw new Error('Operación de inventario no válida.')
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Documento de inventario') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_LISTAR, async (_event, filtros) => {
    try {
      return { ok: true, data: service.listar(filtros || {}) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Listar kardex') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_ENTRADA, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarEntrada(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar entrada') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_SALIDA, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarSalida(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar salida') }
    }
  })

  ipcMain.handle(CANALES.KARDEX_REGISTRAR_REAJUSTE, async (_event, datos) => {
    try {
      return { ok: true, data: service.registrarReajuste(datos) }
    } catch (err) {
      return { ok: false, error: mensajeErrorSql(err, 'Registrar reajuste') }
    }
  })
}
