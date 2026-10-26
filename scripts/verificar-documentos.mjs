// Ejecutar con Node >= 22.13. SQLite en memoria: no modifica la base de la aplicación.
import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { initSchema } from '../src/main/database/schema.js'
import { DocumentosService } from '../src/main/modules/kardex/documentos.service.js'
import { InventarioService } from '../src/main/modules/inventario/inventario.service.js'
import { KardexService } from '../src/main/modules/kardex/kardex.service.js'
import { datosDescargo } from '../src/main/modules/inventario/descargo.datos.js'
import { generarExcelInventario } from '../src/shared/inventario.excel.js'
import ExcelJS from 'exceljs'

const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys = ON')
// Adaptación de la API transaction de better-sqlite3 para verificar el SQL con node:sqlite.
let nivel = 0
db.transaction = (fn) => (...args) => {
  const nombre = `verificacion_${nivel++}`
  db.exec(`SAVEPOINT ${nombre}`)
  try { const r = fn(...args); db.exec(`RELEASE ${nombre}`); return r }
  catch (e) { db.exec(`ROLLBACK TO ${nombre}; RELEASE ${nombre}`); throw e }
}
initSchema(db)
const servicio = new DocumentosService(db)
const proveedor = servicio.crearCatalogo('proveedor', { nombre: 'Proveedor de prueba', nit: '00123-K' })
assert.equal(servicio.crearCatalogo('proveedor', { nombre: 'PROVEEDOR   DE PRUEBA', nit: '' }).id_entidad, proveedor.id_entidad)
const p50 = servicio.crearCatalogo('presentacion', { codigo_producto: '0029878', nombre: 'Guantes', codigo_presentacion: '050', presentacion: 'Caja de 50 unidades', numero_tarjeta: '053944', minimo: 2, maximo: 50 })
const p100 = servicio.crearCatalogo('presentacion', { codigo_producto: '0029878', nombre: 'Guantes', codigo_presentacion: '100', presentacion: 'Caja de 100 unidades', numero_tarjeta: '053945' })
assert.equal(p50.id_producto, p100.id_producto)
assert.notEqual(p50.id_suministro, p100.id_suministro)
assert.equal(servicio.crearCatalogo('presentacion', { codigo_producto: '0029878', codigo_presentacion: '050', presentacion: 'Caja de 50 unidades' }).id_suministro, p50.id_suministro)
assert.throws(() => servicio.crearCatalogo('presentacion', { codigo_producto: '0029878', codigo_presentacion: '01', presentacion: 'Unidad', numero_tarjeta: '053944' }), /tarjeta/)
const modalidad = servicio.crearCatalogo('modalidad', { nombre: 'Compra directa' })
const destino = servicio.crearCatalogo('destino', { nombre: 'Cobán' })
const otro = servicio.crearCatalogo('destino', { nombre: 'Servicio nuevo' })
assert.equal(otro.columna_descargo, 'OTROS')
const linea = (s, lote, vencimiento, cantidad, precio = 10) => ({ id_suministro: s.id_suministro, numero_tarjeta: s.numero_tarjeta, numero_lote: lote, fecha_vencimiento: vencimiento, cantidad, precio_unitario: precio })
const entrada = {
  tipo: 'Entrada_Compra', fecha: '2026-08-01', id_entidad: proveedor.id_entidad,
  referencia: 'FAC-001', id_modalidad: modalidad.id_modalidad, observaciones: 'Documento completo',
  lineas: [linea(p50, 'A', '2027-01-01', 5), linea(p50, 'B', '2028-01-01', 10, 12), linea(p100, 'C', '2028-01-01', 2, 20)]
}
const documento = servicio.guardar(entrada)
assert.match(documento.numero, /^ENT-/)
assert.equal(servicio.reporte().length, 3)
assert.equal(new InventarioService(db).saldo().find((s) => s.id_suministro === p50.id_suministro).saldo_total, 15)
assert.equal(new KardexService(db).listar().length, 3)
const contar = () => db.prepare(`SELECT (SELECT COUNT(*) FROM inventario_documentos) AS documentos,
  (SELECT COUNT(*) FROM transacciones_kardex) AS movimientos,(SELECT COUNT(*) FROM inventario_lotes) AS lotes`).get()
const antes = contar()
assert.throws(() => servicio.guardar({ ...entrada, lineas: [linea(p50, 'NUEVO', '2028-01-01', 1), linea(p100, 'ERROR', '2028-02-30', 1)] }), /vencimiento/)
assert.deepEqual(contar(), antes, 'rollback completo del documento, lotes y movimientos')
assert.throws(() => servicio.guardar({ ...entrada, lineas: [linea(p50, 'A', '2029-01-01', 1)] }), /vencimiento/)
assert.deepEqual(contar(), antes)
const salida = { tipo: 'Salida', fecha: '2026-08-05', id_destino: destino.id_destino, referencia: '', lineas: [{ id_suministro: p50.id_suministro, numero_tarjeta: p50.numero_tarjeta, cantidad: 8 }] }
const revisar = (d) => servicio.previsualizar(d).map((r) => r.lotes.map((l) => [l.id_lote, l.cantidad]))
const plan = servicio.previsualizar(salida)
assert.deepEqual(plan[0].lotes.map((l) => l.cantidad), [5, 3])
assert.throws(() => servicio.guardar(salida), /propuesta/)
const salidaGuardada = servicio.guardar({ ...salida, plan: revisar(salida) })
assert.match(salidaGuardada.numero, /^SAL-/)
assert.equal(servicio.tarjeta(p50.id_suministro).movimientos.at(-1).saldo, 7)
const descargo = datosDescargo(db, { mes: 8, anio: 2026 }).find((s) => s.id_suministro === p50.id_suministro)
assert.equal(descargo.ingresos, 15)
assert.equal(descargo.total_salidas, 8)
assert.equal(descargo.saldo_fisico, 7)
assert.equal(descargo.salidas_por_destino.get(destino.nombre_destino), 8)
assert.throws(() => servicio.previsualizar({ ...salida, lineas: [{ ...salida.lineas[0], cantidad: 4 }, { ...salida.lineas[0], cantidad: 4 }] }), /insuficientes/)
assert.throws(() => servicio.previsualizar({ ...salida, fecha: '2026-07-31', lineas: [{ ...salida.lineas[0], cantidad: 1 }] }), /insuficientes/)
assert.throws(() => servicio.previsualizar({ ...salida, fecha: '2030-01-01' }), /insuficientes/)
// Un plan no se confirma silenciosamente si cambió la distribución disponible.
const anterior = revisar({ ...salida, lineas: [{ ...salida.lineas[0], cantidad: 7 }] })
const otraSalida = { ...salida, lineas: [{ ...salida.lineas[0], cantidad: 1 }] }
servicio.guardar({ ...otraSalida, plan: revisar(otraSalida) })
assert.throws(() => servicio.guardar({ ...salida, lineas: [{ ...salida.lineas[0], cantidad: 7 }], plan: anterior }), /insuficientes|propuesta/)
// No altera el costo de recepciones previas del mismo lote.
servicio.guardar({ ...entrada, fecha: '2026-08-10', lineas: [linea(p50, 'B', '2028-01-01', 2, 99)] })
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM inventario_lotes WHERE numero_lote='B'").get().n, 2)
servicio.guardar({ tipo: 'Inicial', fecha: '2026-07-01', lineas: [linea(p100, 'INICIAL', '2028-01-01', 4)] })
assert.equal(datosDescargo(db, { mes: 8, anio: 2026 }).find((s) => s.id_suministro === p100.id_suministro).saldo_inicial, 4)
servicio.configurar({ institucion: 'Prueba', municipio: 'Cobán' })
assert.equal(servicio.catalogos().configuracion.institucion, 'Prueba')
const loteAjuste = db.prepare("SELECT id_lote FROM inventario_lotes WHERE numero_lote='C'").get()
servicio.reajustar({ fecha: '2026-08-20', id_lote: loteAjuste.id_lote, cantidad: -1, observaciones: 'Diferencia de conteo físico' })
assert.equal(servicio.tarjeta(p100.id_suministro).movimientos.at(-1).cantidad, -1)
const antesAjuste = contar()
assert.throws(() => servicio.reajustar({ fecha: '2026-08-20', id_lote: loteAjuste.id_lote, cantidad: -100, observaciones: 'No debe guardarse' }), /insuficiente/)
assert.deepEqual(contar(), antesAjuste)
assert.throws(() => servicio.reajustar({ fecha: '2026-07-01', id_lote: loteAjuste.id_lote, cantidad: -1, observaciones: 'Sin saldo a esa fecha' }), /insuficiente/)
initSchema(db)
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0)
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM programa_donaciones').get().n, 0)
const ingresosExcel = new ExcelJS.Workbook()
await ingresosExcel.xlsx.load(await generarExcelInventario({ tipo: 'ingresos', datos: servicio.reporte(), desde: '2026-08-01', hasta: '2026-08-09' }))
const hojaIngresos = ingresosExcel.getWorksheet('Ingresos')
assert.equal(hojaIngresos.getCell('B6').value, '00123-K')
assert.equal(hojaIngresos.getCell('J6').value, 'Compra directa')
assert.equal(hojaIngresos.getCell('D6').value, '0029878/050')
assert.equal(hojaIngresos.getCell('I6').numFmt, 'dd/mm/yyyy')
assert.equal(hojaIngresos.getCell('A5').fill.fgColor.argb, 'FF1F4E78')
assert.equal(hojaIngresos.rowCount, 8)
assert.ok(hojaIngresos.getTable('TablaIngresos'))
const tarjetaExcel = new ExcelJS.Workbook()
await tarjetaExcel.xlsx.load(await generarExcelInventario({ tipo: 'tarjeta', datos: servicio.tarjeta(p50.id_suministro), config: { ue: '220', municipio: 'Cobán' }, desde: '2026-08-05' }))
const hojaTarjeta = tarjetaExcel.getWorksheet('Kardex')
assert.match(hojaTarjeta.getCell('A7').value, /Saldo anterior: 15/)
assert.equal(hojaTarjeta.getCell('I10').value, 5)
assert.equal(hojaTarjeta.getCell('K10').value, 10)
assert.equal(hojaTarjeta.views[0].ySplit, 9)
// Migración de catálogos anteriores sin inventar códigos secundarios ni tarjetas.
const legado = new DatabaseSync(':memory:')
legado.transaction = (fn) => (...args) => { legado.exec('SAVEPOINT migracion'); try { const r = fn(...args); legado.exec('RELEASE migracion'); return r } catch (e) { legado.exec('ROLLBACK TO migracion; RELEASE migracion'); throw e } }
legado.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE cat_suministros(id_suministro INTEGER PRIMARY KEY AUTOINCREMENT,codigo_producto TEXT UNIQUE NOT NULL,descripcion_completa TEXT NOT NULL,cantidad_unitaria TEXT NOT NULL);
  INSERT INTO cat_suministros(codigo_producto,descripcion_completa,cantidad_unitaria) VALUES ('0001','Suministro anterior','Unidad');
  CREATE TABLE cat_destinos(id_destino INTEGER PRIMARY KEY AUTOINCREMENT,nombre_destino TEXT NOT NULL UNIQUE);
  INSERT INTO cat_destinos(nombre_destino) VALUES ('Cobán');`)
initSchema(legado)
initSchema(legado)
assert.equal(legado.prepare('SELECT COUNT(*) n FROM cat_suministros').get().n, 1)
assert.equal(legado.prepare('SELECT COUNT(*) n FROM inventario_productos').get().n, 1)
assert.equal(legado.prepare("SELECT COUNT(*) n FROM cat_destinos WHERE nombre_destino IN ('Cobán','COBAN')").get().n, 1)
const suministroLegado = legado.prepare('SELECT * FROM cat_suministros').get()
assert.equal(suministroLegado.codigo_producto, '0001')
assert.equal(suministroLegado.codigo_presentacion, null)
assert.equal(suministroLegado.numero_tarjeta, null)
const actualizado = new DocumentosService(legado).crearCatalogo('presentacion', { id_suministro: suministroLegado.id_suministro, codigo_producto: '0001', codigo_presentacion: '001', presentacion: 'Unidad', numero_tarjeta: '00009' })
assert.equal(actualizado.id_suministro, suministroLegado.id_suministro)
assert.equal(actualizado.codigo_producto, '0001/001')
assert.equal(legado.prepare('PRAGMA foreign_key_check').all().length, 0)
legado.close()
console.log('OK: productos/presentaciones, códigos con ceros, catálogos sin duplicados, documentos múltiples, rollback, FEFO, reservas, fechas, costos, kardex, descargo, inventario inicial y esquema idempotente.')
db.close()
