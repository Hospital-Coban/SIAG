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

let fallos = 0
function comprobar(cond, msg) {
  if (cond) console.log('  ✔ ' + msg)
  else {
    console.error('  ✘ ' + msg)
    fallos++
  }
}

const rutaDb = path.join(os.tmpdir(), 'inventario_prueba.sqlite')
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

console.log('\n1) Esquema + datos de prueba')
const cat = suministros.listar()
comprobar(cat.length === 3, `cat_suministros tiene 3 registros (hay ${cat.length})`)
const ents = entidades.listar()
comprobar(ents.length === 3, `cat_entidades tiene 3 registros (hay ${ents.length})`)

console.log('\n2) Saldo físico dinámico')
const saldo = inventario.saldo()
const suero = saldo.find((s) => s.codigo_producto === 'MED-001')
comprobar(suero && suero.saldo_total === 150, `saldo de suero = 150 (hay ${suero && suero.saldo_total})`)

console.log('\n3) PEPS: salida de 120 unidades de suero')
const proveedor = ents.find((e) => e.tipo_entidad === 'Proveedor')
kardex.registrarSalida({
  id_suministro: suero.id_suministro,
  id_entidad: proveedor.id_entidad,
  cantidad: 120
})
const saldoDespues = inventario.saldo().find((s) => s.codigo_producto === 'MED-001')
comprobar(saldoDespues.saldo_total === 30, `saldo tras salida = 30 (hay ${saldoDespues.saldo_total})`)
const lotesSuero = inventario.listarLotes(suero.id_suministro)
const loteAntes = lotesSuero.find((l) => l.fecha_vencimiento === '2026-01-31')
const loteDespues = lotesSuero.find((l) => l.fecha_vencimiento === '2026-09-30')
comprobar(loteAntes.saldo_lote === 0, `lote 2026-01-31 agotado (saldo ${loteAntes.saldo_lote})`)
comprobar(loteDespues.saldo_lote === 30, `lote 2026-09-30 con saldo 30 (hay ${loteDespues.saldo_lote})`)
const salidas = kardex.listar({ tipo_movimiento: 'Salida' })
comprobar(salidas.length === 2, `la salida generó 2 movimientos PEPS (hay ${salidas.length})`)

console.log('\n4) Stock insuficiente')
let lanzo = false
try {
  kardex.registrarSalida({ id_suministro: suero.id_suministro, id_entidad: proveedor.id_entidad, cantidad: 9999 })
} catch {
  lanzo = true
}
comprobar(lanzo, 'registrarSalida lanza error con stock insuficiente')

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

db.close()
console.log('\n' + (fallos === 0 ? 'RESULTADO: TODAS LAS PRUEBAS PASARON ✔' : `RESULTADO: ${fallos} PRUEBA(S) FALLARON ✘`))
console.log('Base de datos de prueba creada en: ' + rutaDb)
process.exit(fallos === 0 ? 0 : 1)
