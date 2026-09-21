import { contextBridge, ipcRenderer } from 'electron'
import { CANALES } from '../shared/ipc.js'

const invocar = (canal) => (...args) => ipcRenderer.invoke(canal, ...args)

contextBridge.exposeInMainWorld('api', {
  suministros: {
    listar: invocar(CANALES.SUMINISTROS_LISTAR),
    crear: invocar(CANALES.SUMINISTROS_CREAR),
    actualizar: invocar(CANALES.SUMINISTROS_ACTUALIZAR),
    eliminar: invocar(CANALES.SUMINISTROS_ELIMINAR)
  },
  entidades: {
    listar: invocar(CANALES.ENTIDADES_LISTAR),
    crear: invocar(CANALES.ENTIDADES_CREAR),
    actualizar: invocar(CANALES.ENTIDADES_ACTUALIZAR),
    eliminar: invocar(CANALES.ENTIDADES_ELIMINAR)
  },
  inventario: {
    saldo: invocar(CANALES.INVENTARIO_SALDO),
    listarLotes: invocar(CANALES.INVENTARIO_LOTES_LISTAR),
    proximosVencer: invocar(CANALES.INVENTARIO_PROXIMOS_VENCER)
  },
  kardex: {
    listar: invocar(CANALES.KARDEX_LISTAR),
    registrarEntrada: invocar(CANALES.KARDEX_REGISTRAR_ENTRADA),
    registrarSalida: invocar(CANALES.KARDEX_REGISTRAR_SALIDA),
    registrarReajuste: invocar(CANALES.KARDEX_REGISTRAR_REAJUSTE)
  },
  donaciones: {
    listar: invocar(CANALES.DONACIONES_LISTAR),
    obtener: invocar(CANALES.DONACIONES_OBTENER),
    actualizar: invocar(CANALES.DONACIONES_ACTUALIZAR),
    eliminar: invocar(CANALES.DONACIONES_ELIMINAR),
    exportarExcel: invocar(CANALES.DONACIONES_EXPORTAR_EXCEL)
  },
  auth: {
    login: invocar(CANALES.AUTH_LOGIN),
    sesion: invocar(CANALES.AUTH_SESION),
    logout: invocar(CANALES.AUTH_LOGOUT)
  },
  backup: {
    guardar: invocar(CANALES.BACKUP_GUARDAR)
  }
})
