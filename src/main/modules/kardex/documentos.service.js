import { InventarioService } from '../inventario/inventario.service.js'
import { claveMunicipio, MUNICIPIOS } from '../inventario/descargo.datos.js'
import { vincularSuministros } from './documentos.schema.js'

const texto = (v) => String(v ?? '').trim().replace(/\s+/g, ' ')
const clave = (v) => claveMunicipio(texto(v))
const obligatorio = (v, campo) => { const t = texto(v); if (!t) throw new Error(`${campo}: dato obligatorio.`); return t }
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v

export class DocumentosService {
  constructor(db) { this.db = db }

  catalogos() {
    vincularSuministros(this.db)
    return {
      productos: this.db.prepare('SELECT * FROM inventario_productos ORDER BY nombre').all(),
      suministros: this.db.prepare(`SELECT s.*, p.codigo AS codigo_base, p.nombre AS nombre_producto
        FROM cat_suministros s LEFT JOIN inventario_productos p ON p.id_producto = s.id_producto ORDER BY s.descripcion_completa`).all(),
      entidades: this.db.prepare("SELECT * FROM cat_entidades WHERE tipo_entidad <> 'Distrito_Salud' ORDER BY nombre_razon_social").all(),
      destinos: this.db.prepare('SELECT * FROM cat_destinos ORDER BY nombre_destino').all(),
      modalidades: this.db.prepare('SELECT * FROM inventario_modalidades ORDER BY nombre').all(),
      lotes: new InventarioService(this.db).listarLotes(),
      configuracion: JSON.parse(this.db.prepare("SELECT valor FROM configuracion WHERE clave = 'tarjeta_inventario'").get()?.valor || '{}')
    }
  }

  crearCatalogo(tipo, datos) {
    return this.db.transaction(() => {
      if (tipo === 'proveedor') {
        const nombre = obligatorio(datos.nombre, 'Nombre del proveedor/remitente')
        const nit = texto(datos.nit)
        const filas = this.db.prepare("SELECT * FROM cat_entidades WHERE tipo_entidad <> 'Distrito_Salud'").all()
        const existente = filas.find((f) => (nit && clave(f.nit_entidad) === clave(nit)) || clave(f.nombre_razon_social) === clave(nombre))
        if (existente) return existente
        const id = this.db.prepare("INSERT INTO cat_entidades(nombre_razon_social,nit_entidad,tipo_entidad) VALUES (?,?,'Proveedor')").run(nombre, nit || null).lastInsertRowid
        return this.db.prepare('SELECT * FROM cat_entidades WHERE id_entidad = ?').get(id)
      }
      if (tipo === 'destino') {
        const nombre = obligatorio(datos.nombre, 'Destino')
        const existente = this.db.prepare('SELECT * FROM cat_destinos').all().find((f) => clave(f.nombre_destino) === clave(nombre))
        if (existente) return existente
        const columna = MUNICIPIOS.includes(clave(datos.columna_descargo)) ? clave(datos.columna_descargo) : 'OTROS'
        const id = this.db.prepare('INSERT INTO cat_destinos(nombre_destino,columna_descargo) VALUES (?,?)').run(nombre, columna).lastInsertRowid
        return this.db.prepare('SELECT * FROM cat_destinos WHERE id_destino = ?').get(id)
      }
      if (tipo === 'modalidad') {
        const nombre = obligatorio(datos.nombre, 'Modalidad')
        this.db.prepare('INSERT OR IGNORE INTO inventario_modalidades(nombre,clave) VALUES (?,?)').run(nombre, clave(nombre))
        return this.db.prepare('SELECT * FROM inventario_modalidades WHERE clave = ?').get(clave(nombre))
      }
      if (tipo !== 'presentacion') throw new Error('Catálogo no válido.')
      const codigo = obligatorio(datos.codigo_producto, 'Código de producto')
      let producto = this.db.prepare('SELECT * FROM inventario_productos WHERE codigo = ? COLLATE NOCASE').get(codigo)
      if (!producto) {
        const nombre = obligatorio(datos.nombre, 'Nombre del producto')
        const id = this.db.prepare('INSERT INTO inventario_productos(codigo,nombre) VALUES (?,?)').run(codigo, nombre).lastInsertRowid
        producto = this.db.prepare('SELECT * FROM inventario_productos WHERE id_producto = ?').get(id)
      }
      const cp = obligatorio(datos.codigo_presentacion, 'Código de presentación')
      const presentacion = obligatorio(datos.presentacion, 'Presentación / contenido')
      const existente = this.db.prepare('SELECT * FROM cat_suministros WHERE id_producto = ? AND codigo_presentacion = ? COLLATE NOCASE').get(producto.id_producto, cp)
      if (existente && !datos.id_suministro) return existente
      const tarjeta = obligatorio(datos.numero_tarjeta, 'Número de tarjeta kardex')
      if (this.db.prepare('SELECT 1 FROM cat_suministros WHERE numero_tarjeta = ? AND id_suministro <> ?').get(tarjeta, Number(datos.id_suministro || 0))) throw new Error('Ese número de tarjeta ya corresponde a otra presentación.')
      const minimo = datos.minimo === '' || datos.minimo == null ? null : Number(datos.minimo)
      const maximo = datos.maximo === '' || datos.maximo == null ? null : Number(datos.maximo)
      if ([minimo, maximo].some((v) => v !== null && (!Number.isInteger(v) || v < 0)) || (minimo !== null && maximo !== null && minimo > maximo)) throw new Error('Revise los niveles mínimo y máximo.')
      if (datos.id_suministro) {
        const actual = this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?').get(Number(datos.id_suministro))
        if (!actual || actual.id_producto !== producto.id_producto) throw new Error('La presentación debe conservar su producto original.')
        if (clave(actual.cantidad_unitaria) !== clave(presentacion) && this.db.prepare(`SELECT 1 FROM transacciones_kardex t JOIN inventario_lotes l ON l.id_lote=t.id_lote WHERE l.id_suministro=? LIMIT 1`).get(actual.id_suministro)) {
          throw new Error('La presentación ya tiene movimientos. Para cambiar su contenido cree otra presentación, así se conservan las existencias anteriores.')
        }
        if (existente && existente.id_suministro !== actual.id_suministro) throw new Error('El código de presentación ya está registrado en otra presentación.')
        this.db.prepare(`UPDATE cat_suministros SET codigo_producto=?,codigo_presentacion=?,cantidad_unitaria=?,numero_tarjeta=?,minimo=?,maximo=? WHERE id_suministro=?`).run(
          `${producto.codigo}/${cp}`, cp, presentacion, tarjeta, minimo, maximo, actual.id_suministro)
        return this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro=?').get(actual.id_suministro)
      }
      const info = this.db.prepare(`INSERT INTO cat_suministros
        (codigo_producto,descripcion_completa,cantidad_unitaria,id_producto,codigo_presentacion,numero_tarjeta,minimo,maximo)
        VALUES (?,?,?,?,?,?,?,?)`).run(`${producto.codigo}/${cp}`, producto.nombre, presentacion, producto.id_producto, cp, tarjeta, minimo, maximo)
      return this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?').get(info.lastInsertRowid)
    })()
  }

  planSalida(lineas, fecha) {
    const reservas = new Map()
    return lineas.map((linea, i) => {
      const cantidad = Number(linea.cantidad)
      if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error(`Renglón ${i + 1}: cantidad entera positiva obligatoria.`)
      const s = this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?').get(Number(linea.id_suministro))
      if (!s) throw new Error(`Renglón ${i + 1}: seleccione una presentación.`)
      let lotes = new InventarioService(this.db).listarLotes(s.id_suministro).filter((l) => l.fecha_vencimiento >= fecha && l.saldo_lote > 0)
      // No consumir recepciones futuras ni dejar sin saldo una entrega posterior ya registrada.
      lotes = lotes.map((l) => {
        const movimientos = this.db.prepare(`SELECT DATE(fecha_movimiento) AS fecha, SUM(cantidad) AS cantidad
          FROM transacciones_kardex WHERE id_lote = ? GROUP BY DATE(fecha_movimiento) ORDER BY fecha`).all(l.id_lote)
        let saldo = 0, disponible = null
        for (const m of movimientos) {
          if (m.fecha > fecha && disponible === null) disponible = saldo
          saldo += m.cantidad
          if (m.fecha > fecha) disponible = Math.min(disponible, saldo)
        }
        return { ...l, saldo_lote: disponible === null ? saldo : Math.min(disponible, saldo) }
      })
      if (linea.id_lote) lotes = lotes.filter((l) => l.id_lote === Number(linea.id_lote))
      let pendiente = cantidad
      const distribucion = []
      for (const l of lotes) {
        const disponible = l.saldo_lote - (reservas.get(l.id_lote) || 0)
        const tomar = Math.min(pendiente, Math.max(0, disponible))
        if (tomar) {
          distribucion.push({ ...l, cantidad: tomar })
          reservas.set(l.id_lote, (reservas.get(l.id_lote) || 0) + tomar)
          pendiente -= tomar
        }
        if (!pendiente) break
      }
      if (pendiente) throw new Error(`Renglón ${i + 1}: existencias vigentes insuficientes para ${s.descripcion_completa} (${s.cantidad_unitaria}). Faltan ${pendiente}.`)
      return { ...linea, cantidad, suministro: s, lotes: distribucion }
    })
  }

  previsualizar(datos) {
    if (!fechaValida(datos.fecha)) throw new Error('Fecha no válida.')
    if (!Array.isArray(datos.lineas) || !datos.lineas.length) throw new Error('Agregue al menos un producto.')
    return this.planSalida(datos.lineas, datos.fecha)
  }

  reajustar(datos) {
    if (!fechaValida(datos.fecha)) throw new Error('Fecha no válida.')
    const motivo = obligatorio(datos.observaciones, 'Motivo del reajuste')
    const cantidad = Number(datos.cantidad)
    if (!Number.isInteger(cantidad) || cantidad === 0) throw new Error('Indique un reajuste entero positivo o negativo, distinto de cero.')
    return this.db.transaction(() => {
      const lote = this.db.prepare(`SELECT l.*, s.numero_tarjeta FROM inventario_lotes l
        JOIN cat_suministros s ON s.id_suministro = l.id_suministro WHERE l.id_lote = ?`).get(Number(datos.id_lote))
      if (!lote) throw new Error('Seleccione un lote existente.')
      const tarjeta = obligatorio(lote.numero_tarjeta || datos.numero_tarjeta, 'Número de tarjeta')
      if (!lote.numero_tarjeta) {
        if (this.db.prepare('SELECT 1 FROM cat_suministros WHERE numero_tarjeta = ? AND id_suministro <> ?').get(tarjeta, lote.id_suministro)) throw new Error('Tarjeta asignada a otra presentación.')
        this.db.prepare('UPDATE cat_suministros SET numero_tarjeta = ? WHERE id_suministro = ?').run(tarjeta, lote.id_suministro)
      }
      if (cantidad < 0) {
        // Un reajuste puede retirar existencias vencidas, pero nunca volver negativo el saldo.
        const movimientos = this.db.prepare(`SELECT DATE(fecha_movimiento) fecha,SUM(cantidad) cantidad
          FROM transacciones_kardex WHERE id_lote=? GROUP BY DATE(fecha_movimiento) ORDER BY fecha`).all(lote.id_lote)
        let saldo = 0, aplicado = false
        for (const m of movimientos) {
          if (!aplicado && m.fecha > datos.fecha) { saldo += cantidad; aplicado = true; if (saldo < 0) throw new Error('Saldo insuficiente a la fecha del reajuste.') }
          saldo += m.cantidad
          if (aplicado && saldo < 0) throw new Error('El reajuste dejaría un saldo negativo en movimientos posteriores.')
        }
        if (!aplicado && saldo + cantidad < 0) throw new Error('Saldo insuficiente en el lote.')
      }
      let entidad = this.db.prepare("SELECT id_entidad FROM cat_entidades WHERE nombre_razon_social = 'Control de inventario' AND tipo_entidad='Distrito_Salud'").get()
      if (!entidad) entidad = { id_entidad: this.db.prepare("INSERT INTO cat_entidades(nombre_razon_social,tipo_entidad) VALUES ('Control de inventario','Distrito_Salud')").run().lastInsertRowid }
      const id = this.db.prepare(`INSERT INTO inventario_documentos(tipo,fecha,id_entidad,referencia,observaciones)
        VALUES ('Reajuste',?,?,?,?)`).run(datos.fecha, entidad.id_entidad, texto(datos.referencia), motivo).lastInsertRowid
      const numero = `AJU-${String(id).padStart(6, '0')}`
      this.db.prepare('UPDATE inventario_documentos SET numero=? WHERE id_documento=?').run(numero, id)
      this.db.prepare(`INSERT INTO transacciones_kardex(numero_kardex,id_entidad,id_lote,fecha_movimiento,tipo_movimiento,cantidad,documento_referencia,id_documento,observaciones)
        VALUES (?,?,?,?,'Reajuste',?,?,?,?)`).run(tarjeta, entidad.id_entidad, lote.id_lote, `${datos.fecha} 12:00:00`, cantidad, texto(datos.referencia) || numero, id, motivo)
      return { numero, id_documento: id }
    })()
  }

  guardar(datos) {
    if (!['Entrada_Compra', 'Entrada_Donacion', 'Salida', 'Inicial'].includes(datos.tipo)) throw new Error('Tipo de documento no válido.')
    if (!fechaValida(datos.fecha)) throw new Error('Fecha no válida.')
    if (!Array.isArray(datos.lineas) || !datos.lineas.length) throw new Error('Agregue productos al documento.')
    return this.db.transaction(() => {
      const salida = datos.tipo === 'Salida'
      const destino = salida ? this.db.prepare('SELECT * FROM cat_destinos WHERE id_destino = ?').get(Number(datos.id_destino)) : null
      if (salida && !destino) throw new Error('Seleccione el distrito o destino.')
      let entidad = !salida && datos.tipo !== 'Inicial' ? this.db.prepare('SELECT * FROM cat_entidades WHERE id_entidad = ?').get(Number(datos.id_entidad)) : null
      if (!salida && datos.tipo !== 'Inicial' && !entidad) throw new Error('Seleccione un proveedor/remitente.')
      if (!salida && datos.tipo !== 'Inicial') obligatorio(datos.referencia, 'Factura o forma de traslado')
      if (datos.id_modalidad && !this.db.prepare('SELECT 1 FROM inventario_modalidades WHERE id_modalidad = ?').get(Number(datos.id_modalidad))) throw new Error('Modalidad no válida.')
      if (!entidad) {
        const nombre = salida ? destino.nombre_destino : 'Inventario inicial'
        entidad = this.db.prepare("SELECT * FROM cat_entidades WHERE nombre_razon_social = ? AND tipo_entidad = 'Distrito_Salud'").get(nombre)
        if (!entidad) {
          const id = this.db.prepare("INSERT INTO cat_entidades(nombre_razon_social,tipo_entidad) VALUES (?,'Distrito_Salud')").run(nombre).lastInsertRowid
          entidad = { id_entidad: id }
        }
      }
      const plan = salida ? this.planSalida(datos.lineas, datos.fecha) : datos.lineas
      if (salida) {
        const firma = (p) => p.map((r) => r.lotes.map((l) => [l.id_lote, l.cantidad]))
        if (!datos.plan || JSON.stringify(datos.plan) !== JSON.stringify(firma(plan))) throw new Error('Revise nuevamente la propuesta de lotes: la disponibilidad cambió o no se ha confirmado.')
      }
      const id = this.db.prepare(`INSERT INTO inventario_documentos(tipo,fecha,id_entidad,id_destino,referencia,id_modalidad,observaciones)
        VALUES (?,?,?,?,?,?,?)`).run(datos.tipo, datos.fecha, entidad.id_entidad, destino?.id_destino || null, texto(datos.referencia), datos.id_modalidad ? Number(datos.id_modalidad) : null, texto(datos.observaciones)).lastInsertRowid
      const numero = `${salida ? 'SAL' : datos.tipo === 'Inicial' ? 'INI' : 'ENT'}-${String(id).padStart(6, '0')}`
      this.db.prepare('UPDATE inventario_documentos SET numero = ? WHERE id_documento = ?').run(numero, id)
      for (const [i, linea] of plan.entries()) {
        const s = salida ? linea.suministro : this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?').get(Number(linea.id_suministro))
        if (!s) throw new Error(`Renglón ${i + 1}: seleccione una presentación.`)
        const tarjeta = texto(linea.numero_tarjeta || s.numero_tarjeta)
        if (!tarjeta) throw new Error(`Renglón ${i + 1}: complete el número de tarjeta kardex.`)
        if (s.numero_tarjeta && tarjeta !== s.numero_tarjeta) throw new Error('El número de tarjeta no coincide con la presentación.')
        if (!s.numero_tarjeta) {
          if (this.db.prepare('SELECT 1 FROM cat_suministros WHERE numero_tarjeta = ? AND id_suministro <> ?').get(tarjeta, s.id_suministro)) throw new Error('Número de tarjeta asignado a otra presentación.')
          this.db.prepare('UPDATE cat_suministros SET numero_tarjeta = ? WHERE id_suministro = ?').run(tarjeta, s.id_suministro)
        }
        let lotes = linea.lotes
        if (!salida) {
          const cantidad = Number(linea.cantidad), precio = Number(linea.precio_unitario)
          if (!Number.isInteger(cantidad) || cantidad <= 0 || linea.precio_unitario === '' || !Number.isFinite(precio) || precio < 0) throw new Error(`Renglón ${i + 1}: revise cantidad y costo unitario.`)
          const nl = obligatorio(linea.numero_lote, `Renglón ${i + 1}, lote`)
          if (!fechaValida(linea.fecha_vencimiento)) throw new Error(`Renglón ${i + 1}: vencimiento no válido.`)
          const previo = this.db.prepare('SELECT * FROM inventario_lotes WHERE id_suministro = ? AND numero_lote = ? COLLATE NOCASE LIMIT 1').get(s.id_suministro, nl)
          if (previo && previo.fecha_vencimiento !== linea.fecha_vencimiento) throw new Error(`Lote ${nl}: el vencimiento no coincide con el registrado.`)
          // Un mismo lote con distinto costo conserva capas de recepción independientes.
          let lote = this.db.prepare('SELECT * FROM inventario_lotes WHERE id_suministro = ? AND numero_lote = ? COLLATE NOCASE AND fecha_vencimiento = ? AND precio_unitario = ?').get(s.id_suministro, nl, linea.fecha_vencimiento, precio)
          if (!lote) {
            const nuevo = this.db.prepare('INSERT INTO inventario_lotes(id_suministro,numero_lote,fecha_vencimiento,precio_unitario) VALUES (?,?,?,?)').run(s.id_suministro, nl, linea.fecha_vencimiento, precio)
            lote = { id_lote: nuevo.lastInsertRowid }
          }
          lotes = [{ ...lote, cantidad }]
        }
        for (const l of lotes) this.db.prepare(`INSERT INTO transacciones_kardex
          (numero_kardex,id_entidad,id_lote,fecha_movimiento,tipo_movimiento,cantidad,documento_referencia,id_destino,destino,id_documento,observaciones)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(tarjeta, entidad.id_entidad, l.id_lote, `${datos.fecha} 12:00:00`, salida ? 'Salida' : datos.tipo === 'Inicial' ? 'Reajuste' : datos.tipo,
          salida ? -l.cantidad : l.cantidad, texto(datos.referencia) || numero, destino?.id_destino || null, destino?.nombre_destino || null, id, texto(linea.observaciones))
      }
      return { id_documento: id, numero }
    })()
  }

  reporte() {
    return this.db.prepare(`SELECT d.*, e.nombre_razon_social, e.nit_entidad, m.nombre AS modalidad,
      s.codigo_producto,s.descripcion_completa,s.cantidad_unitaria,s.numero_tarjeta,l.numero_lote,l.fecha_vencimiento,
      l.precio_unitario,t.cantidad,t.observaciones AS observaciones_producto,t.id_transaccion
      FROM inventario_documentos d JOIN transacciones_kardex t ON t.id_documento = d.id_documento
      JOIN inventario_lotes l ON l.id_lote = t.id_lote JOIN cat_suministros s ON s.id_suministro = l.id_suministro
      LEFT JOIN cat_entidades e ON e.id_entidad = d.id_entidad
      LEFT JOIN inventario_modalidades m ON m.id_modalidad = d.id_modalidad ORDER BY d.fecha DESC,d.id_documento DESC,t.id_transaccion`).all()
  }

  tarjeta(id_suministro) {
    const suministro = this.db.prepare('SELECT * FROM cat_suministros WHERE id_suministro = ?').get(Number(id_suministro))
    if (!suministro) throw new Error('Seleccione un suministro.')
    const movimientos = this.db.prepare(`SELECT t.*, l.numero_lote,l.fecha_vencimiento,l.precio_unitario,
      e.nombre_razon_social,d.numero AS numero_documento,d.observaciones AS observaciones_documento
      FROM transacciones_kardex t JOIN inventario_lotes l ON l.id_lote=t.id_lote
      LEFT JOIN cat_entidades e ON e.id_entidad=t.id_entidad
      LEFT JOIN inventario_documentos d ON d.id_documento=t.id_documento
      WHERE l.id_suministro=? ORDER BY t.fecha_movimiento,t.id_transaccion`).all(suministro.id_suministro)
    let saldo = 0, valor = 0
    return { suministro, movimientos: movimientos.map((m) => {
      saldo += m.cantidad; valor += m.cantidad * m.precio_unitario
      return { ...m, saldo, valor_saldo: Math.round(valor * 100) / 100 }
    }) }
  }

  configurar(datos) {
    this.db.prepare("INSERT INTO configuracion(clave,valor) VALUES ('tarjeta_inventario',?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor").run(JSON.stringify(datos))
    return datos
  }
}
