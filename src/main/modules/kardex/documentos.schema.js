import { MUNICIPIOS, claveMunicipio } from '../inventario/descargo.datos.js'

export function vincularSuministros(db) {
  db.transaction(() => {
    for (const s of db.prepare('SELECT * FROM cat_suministros WHERE id_producto IS NULL').all()) {
      db.prepare('INSERT OR IGNORE INTO inventario_productos(codigo,nombre) VALUES (?,?)').run(s.codigo_producto, s.descripcion_completa)
      const p = db.prepare('SELECT id_producto FROM inventario_productos WHERE codigo = ?').get(s.codigo_producto)
      db.prepare('UPDATE cat_suministros SET id_producto = ? WHERE id_suministro = ?').run(p.id_producto, s.id_suministro)
    }
  })()
}

export function initDocumentos(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS inventario_productos (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventario_modalidades (
    id_modalidad INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, clave TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS inventario_documentos (
    id_documento INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT UNIQUE,
    tipo TEXT NOT NULL, fecha DATE NOT NULL, id_entidad INTEGER REFERENCES cat_entidades(id_entidad),
    id_destino INTEGER REFERENCES cat_destinos(id_destino), referencia TEXT,
    id_modalidad INTEGER REFERENCES inventario_modalidades(id_modalidad), observaciones TEXT
  );`)
  const agregar = (tabla, columna, tipo) => {
    if (!db.prepare(`PRAGMA table_info(${tabla})`).all().some((c) => c.name === columna)) {
      db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`)
    }
  }
  agregar('cat_suministros', 'id_producto', 'INTEGER REFERENCES inventario_productos(id_producto)')
  agregar('cat_suministros', 'codigo_presentacion', 'TEXT')
  agregar('cat_suministros', 'numero_tarjeta', 'TEXT')
  agregar('cat_suministros', 'minimo', 'INTEGER')
  agregar('cat_suministros', 'maximo', 'INTEGER')
  agregar('cat_destinos', 'columna_descargo', 'TEXT')
  agregar('transacciones_kardex', 'id_documento', 'INTEGER REFERENCES inventario_documentos(id_documento)')
  agregar('transacciones_kardex', 'observaciones', 'TEXT')
  vincularSuministros(db)
  db.transaction(() => {
    for (const nombre of [...MUNICIPIOS, 'OTROS']) {
      const existente = db.prepare('SELECT * FROM cat_destinos').all().find((d) => claveMunicipio(d.nombre_destino) === nombre)
      if (existente) {
        db.prepare('UPDATE cat_destinos SET columna_descargo = COALESCE(columna_descargo, ?) WHERE id_destino = ?').run(nombre, existente.id_destino)
      } else {
        db.prepare('INSERT INTO cat_destinos(nombre_destino,columna_descargo) VALUES (?,?)').run(nombre, nombre)
      }
    }
  })()
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_presentacion_producto ON cat_suministros(id_producto, codigo_presentacion)
    WHERE codigo_presentacion IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_movimiento_documento ON transacciones_kardex(id_documento);`)
  db.prepare("INSERT OR IGNORE INTO configuracion(clave,valor) VALUES ('tarjeta_inventario',?)").run(JSON.stringify({
    institucion: 'Dirección Departamental de Redes Integradas de Servicios de Salud de Alta Verapaz',
    unidad: 'Unidad de Almacén', ue: '220', municipio: 'Cobán',
    direccion: '7a. Calle 6-24 Zona 11, Cobán, Alta Verapaz', telefono: '7951-4300', distrito: '', servicio: ''
  }))
}
