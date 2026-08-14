import { hashPassword } from '../modules/auth/password.js'

const USUARIO_DEFAULT = 'lorenzo784'
const PASSWORD_DEFAULT = '12345678'

export function seedUsuario(db) {
  const existe = db
    .prepare('SELECT id_usuario FROM usuarios WHERE usuario = ?')
    .get(USUARIO_DEFAULT)
  if (existe) return
  db.prepare('INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)').run(
    USUARIO_DEFAULT,
    hashPassword(PASSWORD_DEFAULT)
  )
}

export function seedDemo(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM cat_suministros').get()
  if (n > 0) return

  const insertSuministro = db.prepare(
    `INSERT INTO cat_suministros (codigo_producto, descripcion_completa, cantidad_unitaria)
     VALUES (@codigo, @descripcion, @unidad)`
  )
  const insertEntidad = db.prepare(
    `INSERT INTO cat_entidades (nit_entidad, nombre_razon_social, tipo_entidad)
     VALUES (@nit, @nombre, @tipo)`
  )
  const insertLote = db.prepare(
    `INSERT INTO inventario_lotes (id_suministro, numero_lote, fecha_vencimiento, precio_unitario)
     VALUES (@id_suministro, @numero_lote, @vencimiento, @precio)`
  )
  const insertKardex = db.prepare(
    `INSERT INTO transacciones_kardex
       (numero_kardex, id_entidad, id_lote, tipo_movimiento, cantidad, documento_referencia)
     VALUES (@numero_kardex, @id_entidad, @id_lote, @tipo, @cantidad, @documento)`
  )

  const seed = db.transaction(() => {
    const suero = insertSuministro.run({
      codigo: 'MED-001',
      descripcion: 'Suero fisiológico 0.9%',
      unidad: 'CAJA/540 GOTERO'
    }).lastInsertRowid
    const jeringa = insertSuministro.run({
      codigo: 'MED-002',
      descripcion: 'Jeringa desechable 5ml',
      unidad: 'CAJA/100 UNIDADES'
    }).lastInsertRowid
    const guantes = insertSuministro.run({
      codigo: 'INS-001',
      descripcion: 'Guantes de látex talla M',
      unidad: 'CAJA/100 UNIDADES'
    }).lastInsertRowid

    const proveedor = insertEntidad.run({
      nit: '123456-7',
      nombre: 'Distribuidora Médica S.A.',
      tipo: 'Proveedor'
    }).lastInsertRowid
    const ong = insertEntidad.run({
      nit: '765432-1',
      nombre: 'ONG Ayuda Hospitalaria',
      tipo: 'ONG'
    }).lastInsertRowid
    const distrito = insertEntidad.run({
      nit: null,
      nombre: 'Distrito de Salud Central',
      tipo: 'Distrito_Salud'
    }).lastInsertRowid

    const lote1 = insertLote.run({
      id_suministro: Number(suero),
      numero_lote: 'L-2025-01',
      vencimiento: '2026-01-31',
      precio: 12.5
    }).lastInsertRowid
    const lote2 = insertLote.run({
      id_suministro: Number(suero),
      numero_lote: 'L-2025-02',
      vencimiento: '2026-09-30',
      precio: 13.0
    }).lastInsertRowid
    const lote3 = insertLote.run({
      id_suministro: Number(jeringa),
      numero_lote: 'L-JER-10',
      vencimiento: '2026-12-31',
      precio: 2.75
    }).lastInsertRowid
    const lote4 = insertLote.run({
      id_suministro: Number(guantes),
      numero_lote: 'L-GUA-07',
      vencimiento: '2026-06-30',
      precio: 5.0
    }).lastInsertRowid

    insertKardex.run({
      numero_kardex: 'K-0001',
      id_entidad: Number(proveedor),
      id_lote: Number(lote1),
      tipo: 'Entrada_Compra',
      cantidad: 100,
      documento: 'FACT-1001'
    })
    insertKardex.run({
      numero_kardex: 'K-0002',
      id_entidad: Number(proveedor),
      id_lote: Number(lote2),
      tipo: 'Entrada_Compra',
      cantidad: 50,
      documento: 'FACT-1002'
    })
    insertKardex.run({
      numero_kardex: 'K-0003',
      id_entidad: Number(ong),
      id_lote: Number(lote3),
      tipo: 'Entrada_Donacion',
      cantidad: 200,
      documento: null
    })
    insertKardex.run({
      numero_kardex: 'K-0004',
      id_entidad: Number(distrito),
      id_lote: Number(lote4),
      tipo: 'Entrada_Compra',
      cantidad: 80,
      documento: 'FACT-1003'
    })
  })

  seed()
}
