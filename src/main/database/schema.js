export function initSchema(db) {
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
}
