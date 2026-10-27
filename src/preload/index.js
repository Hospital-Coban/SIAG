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
  destinos: {
    listar: invocar(CANALES.DESTINOS_LISTAR),
    crear: invocar(CANALES.DESTINOS_CREAR),
    actualizar: invocar(CANALES.DESTINOS_ACTUALIZAR),
    eliminar: invocar(CANALES.DESTINOS_ELIMINAR)
  },
inventario: {
    exportarExcel: invocar(CANALES.INVENTARIO_EXPORTAR_ARCHIVO),
    documentos: invocar(CANALES.INVENTARIO_DOCUMENTOS),
    saldo: invocar(CANALES.INVENTARIO_SALDO),
    listarLotes: invocar(CANALES.INVENTARIO_LOTES_LISTAR),
    proximosVencer: invocar(CANALES.INVENTARIO_PROXIMOS_VENCER),
    reporte: invocar(CANALES.INVENTARIO_REPORTE),
    exportarSemaforo: invocar(CANALES.INVENTARIO_EXPORTAR_SEMAFORO),
    exportarDescargo: invocar(CANALES.INVENTARIO_EXPORTAR_DESCARGO)
  },
  kardex: {
    listar: invocar(CANALES.KARDEX_LISTAR),
    registrarEntrada: invocar(CANALES.KARDEX_REGISTRAR_ENTRADA),
    registrarSalida: invocar(CANALES.KARDEX_REGISTRAR_SALIDA),
    registrarReajuste: invocar(CANALES.KARDEX_REGISTRAR_REAJUSTE)
  },
  donaciones: {
    listarOng: invocar(CANALES.DONACIONES_ONG_LISTAR),
    crear: invocar(CANALES.DONACIONES_CREAR),
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
    guardar: invocar(CANALES.BACKUP_GUARDAR),
    restaurar: invocar(CANALES.BACKUP_RESTAURAR)
  },
  config: {
    obtener: invocar(CANALES.CONFIG_OBTENER),
    guardar: invocar(CANALES.CONFIG_GUARDAR)
  },
  notificaciones: {
    probar: invocar(CANALES.NOTIFICACIONES_PROBAR)
  },
  actualizaciones: {
    estado: invocar(CANALES.ACTUALIZACIONES_ESTADO),
    buscar: invocar(CANALES.ACTUALIZACIONES_BUSCAR),
    instalar: invocar(CANALES.ACTUALIZACIONES_INSTALAR),
    onEstado: (callback) => {
      const receptor = (_event, estado) => callback(estado)
      ipcRenderer.on('actualizaciones:estado', receptor)
      return () => ipcRenderer.removeListener('actualizaciones:estado', receptor)
    }
  }
})
