import { registrarSuministrosIpc } from '../modules/suministros/suministros.controller.js'
import { registrarEntidadesIpc } from '../modules/entidades/entidades.controller.js'
import { registrarInventarioIpc } from '../modules/inventario/inventario.controller.js'
import { registrarKardexIpc } from '../modules/kardex/kardex.controller.js'
import { registrarDonacionesIpc } from '../modules/donaciones/donaciones.controller.js'
import { registrarBackupIpc } from '../modules/backup/backup.controller.js'

export function registrarIpc(db) {
  registrarSuministrosIpc(db)
  registrarEntidadesIpc(db)
  registrarInventarioIpc(db)
  registrarKardexIpc(db)
  registrarDonacionesIpc(db)
  registrarBackupIpc(db)
}
