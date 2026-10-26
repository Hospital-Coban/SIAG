import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { initSchema } from '../src/main/database/schema.js'
import { seedDemo } from '../src/main/database/seed.js'
import { SuministrosService } from '../src/main/modules/suministros/suministros.service.js'
import { EntidadesService } from '../src/main/modules/entidades/entidades.service.js'
import { InventarioService } from '../src/main/modules/inventario/inventario.service.js'
import { KardexService } from '../src/main/modules/kardex/kardex.service.js'
import { DonacionesService } from '../src/main/modules/donaciones/donaciones.service.js'
import { NotificacionesService } from '../src/main/modules/notificaciones/notificaciones.service.js'
import { ConfiguracionService } from '../src/main/modules/configuracion/configuracion.service.js'
import { estadoVencimiento } from '../src/shared/semaforo.js'

let fallos = 0
function comprobar(cond, msg) {
  if (cond) console.log('  ✔ ' + msg)
  else {
    console.error('  ✘ ' + msg)
    fallos++
  }
}

const rutaDb = path.join(os.tmpdir(), 'inventario_prueba.sqlite')
for (const sufijo of ['', '-wal', '-shm']) {
  fs.rmSync(rutaDb + sufijo, { force: true })
}
const db = new Database(rutaDb)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
initSchema(db)
seedDemo(db)

const suministros = new SuministrosService(db)
const entidades = new EntidadesService(db)
const inventario = new InventarioService(db)
const kardex = new KardexService(db)
const donaciones = new DonacionesService(db)
const notificaciones = new NotificacionesService(db)
const configuracion = new ConfiguracionService(db)

console.log('\n1) Esquema + datos de prueba')
const cat = suministros.listar()
comprobar(cat.length === 3, `cat_suministros tiene 3 registros (hay ${cat.length})`)
const ents = entidades.listar()
comprobar(ents.length === 3, `cat_entidades tiene 3 registros (hay ${ents.length})`)

console.log('\n2) Saldo físico dinámico')
const saldo = inventario.saldo()
const suero = saldo.find((s) => s.codigo_producto === 'MED-001')
comprobar(suero && suero.saldo_total === 150, `saldo de suero = 150 (hay ${suero && suero.saldo_total})`)

console.log('\n3) Salida con lote obligatorio: 70 unidades del lote L-2025-01')
const proveedor = ents.find((e) => e.tipo_entidad === 'Proveedor')
const lotesAntes = inventario.listarLotes(suero.id_suministro)
const lote1Antes = lotesAntes.find((l) => l.numero_lote === 'L-2025-01')
let lanzoSinLote = false
try {
  kardex.registrarSalida({
    id_suministro: suero.id_suministro,
    id_entidad: proveedor.id_entidad,
    cantidad: 10
  })
} catch {
  lanzoSinLote = true
}
comprobar(lanzoSinLote, 'registrarSalida lanza error si no se especifica el lote')

kardex.registrarSalida({
  id_suministro: suero.id_suministro,
  id_lote: lote1Antes.id_lote,
  id_entidad: proveedor.id_entidad,
  cantidad: 70
})
const saldoDespues = inventario.saldo().find((s) => s.codigo_producto === 'MED-001')
comprobar(saldoDespues.saldo_total === 80, `saldo tras salida = 80 (hay ${saldoDespues.saldo_total})`)
const lotesSuero = inventario.listarLotes(suero.id_suministro)
const lote1 = lotesSuero.find((l) => l.numero_lote === 'L-2025-01')
const lote2 = lotesSuero.find((l) => l.numero_lote === 'L-2025-02')
comprobar(lote1.saldo_lote === 30, `lote L-2025-01 con saldo 30 (hay ${lote1.saldo_lote})`)
comprobar(lote2.saldo_lote === 50, `lote L-2025-02 intacto con saldo 50 (hay ${lote2.saldo_lote})`)
const salidas = kardex.listar({ tipo_movimiento: 'Salida' })
comprobar(salidas.length === 1, `la salida generó 1 movimiento (hay ${salidas.length})`)
comprobar(
  salidas[0].id_lote === lote1Antes.id_lote && salidas[0].numero_lote === 'L-2025-01',
  `el movimiento quedó asociado al lote L-2025-01 (quedó ${salidas[0].numero_lote})`
)

console.log('\n4) Stock insuficiente en el lote elegido')
let lanzo = false
try {
  kardex.registrarSalida({
    id_suministro: suero.id_suministro,
    id_lote: lote1Antes.id_lote,
    id_entidad: proveedor.id_entidad,
    cantidad: 9999
  })
} catch {
  lanzo = true
}
comprobar(lanzo, 'registrarSalida lanza error si el lote no alcanza')

console.log('\n5) Entrada por donación + expediente UCNI')
const ong = ents.find((e) => e.tipo_entidad === 'ONG')
const jeringa = saldo.find((s) => s.codigo_producto === 'MED-002')
kardex.registrarEntrada({
  id_suministro: jeringa.id_suministro,
  id_entidad: ong.id_entidad,
  numero_lote: 'L-JER-99',
  fecha_vencimiento: '2027-01-01',
  precio_unitario: 0,
  cantidad: 50,
  tipo_movimiento: 'Entrada_Donacion',
  expediente: {
    no_expediente_ucni: 'UCNI-2026-001',
    dictamen_tecnico: 'DT-123',
    codigos_presupuestarios: 'SIGES: 111; SICOIN: 222'
  }
})
const exps = donaciones.listar()
comprobar(exps.length === 1, `se creó 1 expediente de donación (hay ${exps.length})`)
comprobar(exps[0].no_expediente_ucni === 'UCNI-2026-001', 'expediente con número UCNI correcto')

console.log('\n6) Integridad referencial (ON DELETE RESTRICT)')
let bloqueo = false
try {
  suministros.eliminar(suero.id_suministro)
} catch {
  bloqueo = true
}
comprobar(bloqueo, 'eliminar un suministro con historial es bloqueado por la FK')

console.log('\n7) Reajuste')
const loteJeringa = inventario.listarLotes(jeringa.id_suministro).find((l) => l.numero_lote === 'L-JER-99')
kardex.registrarReajuste({ id_lote: loteJeringa.id_lote, id_entidad: proveedor.id_entidad, cantidad: -10 })
const saldoJeringa = inventario.saldo().find((s) => s.codigo_producto === 'MED-002')
comprobar(saldoJeringa.saldo_total === 240, `jeringa tras donación(50) + reajuste(-10) = 240 (hay ${saldoJeringa.saldo_total})`)

console.log('\n8) Configuración por defecto de notificaciones')
const cfgNotif = configuracion.obtener('notificaciones_vencimiento')
comprobar(cfgNotif.valor === '1', `notificaciones_vencimiento activadas por defecto (hay ${cfgNotif.valor})`)
configuracion.guardar('notificaciones_vencimiento', '0')
comprobar(
  configuracion.obtener('notificaciones_vencimiento').valor === '0',
  'guardar("0") desactiva las notificaciones'
)
configuracion.guardar('notificaciones_vencimiento', '1')

console.log('\n9) Notificaciones: cambio de estado de lotes con stock')
// Primera pasada: todos los lotes se registran sin avisos.
const primeraPasada = notificaciones.detectarCambios()
comprobar(primeraPasada.length === 0, `la primera pasada no genera avisos (hay ${primeraPasada.length})`)

// Forzar un cambio: L-2025-01 debe tener un estado distinto al actual.
const loteNotif = inventario.listarLotes(suero.id_suministro).find((l) => l.numero_lote === 'L-2025-01')
const estadoActual = estadoVencimiento(loteNotif.fecha_vencimiento)
const estadoFalso = estadoActual === 'verde' ? 'rojo' : 'verde'
db.prepare('UPDATE inventario_lotes SET ultimo_estado = ? WHERE id_lote = ?').run(estadoFalso, loteNotif.id_lote)

const cambios = notificaciones.detectarCambios()
comprobar(cambios.length === 1, `hay 1 cambio de estado (hay ${cambios.length})`)
comprobar(cambios[0].numero_lote === 'L-2025-01', `el cambio es del lote L-2025-01 (es ${cambios[0] && cambios[0].numero_lote})`)
comprobar(
  cambios[0].estado_anterior === estadoFalso && cambios[0].estado_nuevo === estadoActual,
  `transición ${estadoFalso} → ${estadoActual}`
)

// Segunda pasada: no debe repetir el aviso.
const segundaPasada = notificaciones.detectarCambios()
comprobar(segundaPasada.length === 0, `la segunda pasada no repite avisos (hay ${segundaPasada.length})`)

// Lote agotado: no se toma en cuenta.
const guantes = saldo.find((s) => s.codigo_producto === 'INS-001')
const loteGuantes = inventario.listarLotes(guantes.id_suministro).find((l) => l.numero_lote === 'L-GUA-07')
kardex.registrarReajuste({ id_lote: loteGuantes.id_lote, id_entidad: proveedor.id_entidad, cantidad: -80 })
const estadoGuantes = estadoVencimiento(loteGuantes.fecha_vencimiento)
const estadoFalsoGuantes = estadoGuantes === 'verde' ? 'rojo' : 'verde'
db.prepare('UPDATE inventario_lotes SET ultimo_estado = ? WHERE id_lote = ?').run(estadoFalsoGuantes, loteGuantes.id_lote)
const cambiosSinStock = notificaciones.detectarCambios()
comprobar(
  cambiosSinStock.length === 0 && cambiosSinStock.every((c) => c.id_lote !== loteGuantes.id_lote),
  'un lote agotado (saldo 0) no genera notificación'
)

db.close()
console.log('\n' + (fallos === 0 ? 'RESULTADO: TODAS LAS PRUEBAS PASARON ✔' : `RESULTADO: ${fallos} PRUEBA(S) FALLARON ✘`))
console.log('Base de datos de prueba creada en: ' + rutaDb)
process.exit(fallos === 0 ? 0 : 1)
