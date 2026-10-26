import { limpiarNombreOng, claveNombreOng } from '../../shared/donaciones.js'
import { initDocumentos } from '../modules/kardex/documentos.schema.js'

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ong_donantes (
      id_ong INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      nombre_normalizado TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS programa_donaciones (
      id_expediente INTEGER PRIMARY KEY AUTOINCREMENT,
      id_expediente_origen INTEGER UNIQUE,
      id_ong INTEGER NOT NULL REFERENCES ong_donantes(id_ong) ON DELETE RESTRICT,
      fecha_entrega DATE,
      datos TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_programa_entrega ON programa_donaciones(fecha_entrega);
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cat_suministros (
      id_suministro       INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_producto     VARCHAR(50) UNIQUE NOT NULL,
      descripcion_completa TEXT NOT NULL,
      cantidad_unitaria   VARCHAR(100) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cat_entidades (
      id_entidad         INTEGER PRIMARY KEY AUTOINCREMENT,
      nit_entidad        VARCHAR(20),
      nombre_razon_social VARCHAR(200) NOT NULL,
      tipo_entidad       TEXT NOT NULL
        CHECK (tipo_entidad IN ('Proveedor', 'ONG', 'Distrito_Salud'))
    );

    CREATE TABLE IF NOT EXISTS inventario_lotes (
      id_lote            INTEGER PRIMARY KEY AUTOINCREMENT,
      id_suministro      INTEGER NOT NULL,
      numero_lote        VARCHAR(50) NOT NULL,
      fecha_vencimiento  DATE NOT NULL,
      precio_unitario    DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (id_suministro)
        REFERENCES cat_suministros (id_suministro)
        ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS transacciones_kardex (
      id_transaccion      INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_kardex       VARCHAR(50) NOT NULL,
      id_entidad          INTEGER NOT NULL,
      id_lote             INTEGER NOT NULL,
      fecha_movimiento    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tipo_movimiento     TEXT NOT NULL
        CHECK (tipo_movimiento IN ('Entrada_Compra', 'Entrada_Donacion', 'Salida', 'Reajuste')),
      cantidad            INTEGER NOT NULL,
      documento_referencia VARCHAR(100),
      destino             VARCHAR(200),
      FOREIGN KEY (id_entidad)
        REFERENCES cat_entidades (id_entidad)
        ON DELETE RESTRICT,
      FOREIGN KEY (id_lote)
        REFERENCES inventario_lotes (id_lote)
        ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS expedientes_donacion (
      id_expediente            INTEGER PRIMARY KEY AUTOINCREMENT,
      id_transaccion           INTEGER UNIQUE NOT NULL,
      ano_donacion             INTEGER,
      no_expediente            VARCHAR(100),
      tipo_donacion            VARCHAR(100),
      no_caso_ucni             VARCHAR(100),
      numero_siges             VARCHAR(50),
      nombre_licenciado_ucni   VARCHAR(200),
      no_carta_intencion       VARCHAR(100),
      fecha_carta_intencion    DATE,
      dictamen_tecnico         VARCHAR(100),
      fecha_dictamen_tecnico   DATE,
      no_carta_agradecimiento  VARCHAR(100),
      fecha_carta_agradecimiento DATE,
      no_acta_administrativa   VARCHAR(100),
      fecha_suscripcion_acta   DATE,
      no_ingreso_almacen       VARCHAR(100),
      anexo_utilizado          VARCHAR(100),
      no_oficio_entrega        VARCHAR(100),
      no_acuerdo_ministerial   VARCHAR(100),
      fecha_aprobacion_acuerdo DATE,
      codigo_siges             VARCHAR(50),
      codigo_sicoin            VARCHAR(50),
      cur                      VARCHAR(100),
      
      no_expediente_ucni       VARCHAR(100),
      codigos_presupuestarios  TEXT,
      
      FOREIGN KEY (id_transaccion)
        REFERENCES transacciones_kardex (id_transaccion)
        ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario    INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario       TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sesiones (
      token      TEXT PRIMARY KEY,
      id_usuario INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
    );
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lotes_suministro
      ON inventario_lotes (id_suministro);
    CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento
      ON inventario_lotes (fecha_vencimiento);
    CREATE INDEX IF NOT EXISTS idx_kardex_lote
      ON transacciones_kardex (id_lote);
    CREATE INDEX IF NOT EXISTS idx_kardex_entidad
      ON transacciones_kardex (id_entidad);
  `)

  // Migración automática para nuevas columnas en expedientes_donacion
  const columnasNuevas = [
    'ano_donacion INTEGER',
    'no_expediente VARCHAR(100)',
    'tipo_donacion VARCHAR(100)',
    'no_caso_ucni VARCHAR(100)',
    'numero_siges VARCHAR(50)',
    'nombre_licenciado_ucni VARCHAR(200)',
    'no_carta_intencion VARCHAR(100)',
    'fecha_carta_intencion DATE',
    'fecha_dictamen_tecnico DATE',
    'no_carta_agradecimiento VARCHAR(100)',
    'fecha_carta_agradecimiento DATE',
    'no_acta_administrativa VARCHAR(100)',
    'fecha_suscripcion_acta DATE',
    'no_ingreso_almacen VARCHAR(100)',
    'anexo_utilizado VARCHAR(100)',
    'no_oficio_entrega VARCHAR(100)',
    'no_acuerdo_ministerial VARCHAR(100)',
    'fecha_aprobacion_acuerdo DATE',
    'codigo_siges VARCHAR(50)',
    'codigo_sicoin VARCHAR(50)',
    'cur VARCHAR(100)'
  ]

  columnasNuevas.forEach(colDef => {
    try {
      db.exec(`ALTER TABLE expedientes_donacion ADD COLUMN ${colDef}`)
    } catch (e) {
      // Si falla, asumimos que la columna ya existe
    }
  })

  try {
    db.exec(`ALTER TABLE transacciones_kardex ADD COLUMN destino VARCHAR(200);`)
  } catch (e) {
    // Si falla, asumimos que la columna ya existe
  }

  // Destinos como catálogo en lugar de texto libre.
  db.exec(`
    CREATE TABLE IF NOT EXISTS cat_destinos (
      id_destino    INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_destino VARCHAR(200) NOT NULL UNIQUE
    );
  `)

  try {
    db.exec(`ALTER TABLE transacciones_kardex ADD COLUMN id_destino INTEGER;`)
  } catch (e) {
    // Si falla, asumimos que la columna ya existe
  }

  // Backfill: cada destino de texto libre previo se vuelve una fila del catálogo.
  const destinosLibres = db
    .prepare(
      `SELECT DISTINCT destino AS destino, TRIM(destino) AS nombre
       FROM transacciones_kardex
       WHERE destino IS NOT NULL AND TRIM(destino) <> ''`
    )
    .all()

  const insertarDestino = db.prepare(
    'INSERT OR IGNORE INTO cat_destinos (nombre_destino) VALUES (?)'
  )
  const buscarDestino = db.prepare(
    'SELECT id_destino FROM cat_destinos WHERE nombre_destino = ?'
  )
  const asignarDestino = db.prepare(
    'UPDATE transacciones_kardex SET id_destino = ? WHERE destino = ? AND id_destino IS NULL'
  )

  const migrarDestinos = db.transaction(() => {
    for (const { destino, nombre } of destinosLibres) {
      insertarDestino.run(nombre)
      const { id_destino } = buscarDestino.get(nombre)
      asignarDestino.run(id_destino, destino)
    }
  })
  migrarDestinos()

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kardex_destino
      ON transacciones_kardex (id_destino);
  `)

  // Último estado del semáforo registrado por lote (verde/amarillo/rojo).
  try {
    db.exec(`ALTER TABLE inventario_lotes ADD COLUMN ultimo_estado VARCHAR(10);`)
  } catch (e) {
    // Si falla, asumimos que la columna ya existe
  }

  // Configuración de la aplicación (clave/valor).
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );
  `)

  // Migración única: copiar solo los nombres usados en donaciones y quitar la FK a entidades.
  if (db.prepare('PRAGMA table_info(programa_donaciones)').all().some((c) => c.name === 'id_entidad')) {
    db.transaction(() => {
      const anteriores = db.prepare(`SELECT p.*, e.nombre_razon_social FROM programa_donaciones p
        JOIN cat_entidades e ON e.id_entidad = p.id_entidad`).all()
      db.exec(`CREATE TABLE programa_donaciones_nuevo (
        id_expediente INTEGER PRIMARY KEY AUTOINCREMENT,
        id_expediente_origen INTEGER UNIQUE,
        id_ong INTEGER NOT NULL REFERENCES ong_donantes(id_ong) ON DELETE RESTRICT,
        fecha_entrega DATE,
        datos TEXT NOT NULL
      )`)
      for (const fila of anteriores) {
        const nombre = limpiarNombreOng(fila.nombre_razon_social)
        const clave = claveNombreOng(nombre)
        db.prepare('INSERT OR IGNORE INTO ong_donantes(nombre, nombre_normalizado) VALUES (?, ?)').run(nombre, clave)
        const { id_ong } = db.prepare('SELECT id_ong FROM ong_donantes WHERE nombre_normalizado = ?').get(clave)
        const datos = JSON.parse(fila.datos)
        delete datos.id_entidad
        datos.nombre_ong = nombre
        db.prepare(`INSERT INTO programa_donaciones_nuevo
          (id_expediente, id_expediente_origen, id_ong, fecha_entrega, datos) VALUES (?, ?, ?, ?, ?)`).run(
          fila.id_expediente, fila.id_expediente_origen, id_ong, fila.fecha_entrega, JSON.stringify(datos))
      }
      db.exec(`DROP TABLE programa_donaciones;
        ALTER TABLE programa_donaciones_nuevo RENAME TO programa_donaciones;`)
    })()
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_programa_donante ON programa_donaciones(id_ong);
    CREATE INDEX IF NOT EXISTS idx_programa_entrega ON programa_donaciones(fecha_entrega);`)

  initDocumentos(db)

  const hayConfigNotif = db
    .prepare(`SELECT 1 FROM configuracion WHERE clave = 'notificaciones_vencimiento'`)
    .get()
  if (!hayConfigNotif) {
    db.prepare(
      `INSERT INTO configuracion (clave, valor) VALUES ('notificaciones_vencimiento', '1')`
    ).run()
  }
}
