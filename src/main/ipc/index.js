import { registrarSuministrosIpc } from '../modules/suministros/suministros.controller.js'
import { registrarEntidadesIpc } from '../modules/entidades/entidades.controller.js'
import { registrarDestinosIpc } from '../modules/destinos/destinos.controller.js'
import { registrarInventarioIpc } from '../modules/inventario/inventario.controller.js'
import { registrarKardexIpc } from '../modules/kardex/kardex.controller.js'
import { registrarDonacionesIpc } from '../modules/donaciones/donaciones.controller.js'
import { registrarBackupIpc } from '../modules/backup/backup.controller.js'
import { registrarConfiguracionIpc } from '../modules/configuracion/configuracion.controller.js'
import { registrarNotificacionesIpc } from '../modules/notificaciones/notificaciones.controller.js'
import { registrarActualizacionesIpc } from '../modules/actualizaciones/actualizaciones.controller.js'

export function registrarIpc(db) {
  registrarSuministrosIpc(db)
  registrarEntidadesIpc(db)
  registrarDestinosIpc(db)
  registrarInventarioIpc(db)
  registrarKardexIpc(db)
  registrarDonacionesIpc(db)
  registrarBackupIpc(db)
  registrarConfiguracionIpc(db)
  registrarNotificacionesIpc()
  registrarActualizacionesIpc()
}
