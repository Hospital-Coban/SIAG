# Descripción general del sistema — Inventario Hospitalario

## 1. Propósito y alcance

Aplicación de escritorio Electron, con interfaz React y base local SQLite, para
el almacén de material médico-quirúrgico de Alta Verapaz. Funciona sin conexión.

Esta documentación cubre dos áreas independientes:

1. **Programa de donaciones:** registro documental con los campos del formato
   entregado, catálogo propio de ONG y fecha de entrega de la donación.
2. **Inventario y kardex:** recepción y entrega de suministros por documentos con
   varios productos/presentaciones, control de lotes, existencias y reportes.

La autenticación, las actualizaciones y las notificaciones no se detallan en estos
flujos. El respaldo continúa generando una copia de la base SQLite.

## 2. Arquitectura

| Capa | Tecnología / responsabilidad |
|---|---|
| Interfaz | React 18, Tailwind y DaisyUI; formularios, consultas y generación de algunos Excel |
| Preload | `contextBridge`, API `window.api.*` |
| Proceso principal | Electron 33, controladores IPC y servicios con reglas de negocio |
| Persistencia | SQLite mediante `better-sqlite3`; WAL, claves foráneas activas |
| Excel | ExcelJS; reportes basados en plantillas para semáforo y descargo |

Los canales están en `src/shared/ipc.js`. La conexión y las migraciones se encuentran
en `src/main/database/`; el esquema adicional de inventario está en
`src/main/modules/kardex/documentos.schema.js`.

## 3. Programa de donaciones

- Un formulario con los campos del Excel original, sin lote, vencimiento ni kardex.
- **ONG donante:** solo nombre, almacenado en `ong_donantes`. Se busca una existente
  o se escribe una nueva; se crea/reutiliza al guardar la donación.
- Los nombres se limpian de espacios repetidos y se comparan sin diferencias de
  mayúsculas ni acentos para evitar duplicados.
- **Fecha de entrega:** corresponde a la entrega de la donación. Es independiente
  de cualquier fecha de inventario y puede quedar vacía.
- Registro, consulta, detalle, edición y eliminación en `programa_donaciones`.
- Cantidad entera positiva, valor unitario no negativo y monto total calculado.
- Filtros combinables: texto, ONG con donaciones registradas y rango de entrega.
- Exportación de los registros filtrados a Excel con tabla azul, filas alternadas,
  filtros, encabezado fijo, fechas y moneda Q.

El Excel tiene **29 columnas**: las 28 del formato original, incluyendo `No.`,
más fecha de entrega. El consecutivo `No.` es de presentación, no un campo editable.
La lista completa está en [Flujo de donaciones](flujo-donaciones.md).

**Independencia:** ninguna operación de este módulo modifica lotes, movimientos o
existencias. `ong_donantes` no utiliza `cat_entidades`.

## 4. Inventario por documentos

### 4.1 Catálogos y presentaciones

Un producto tiene código y nombre; puede tener varias presentaciones, cada una con
código propio, tarjeta kardex, niveles mínimo/máximo y existencias separadas.

Ejemplo ilustrativo:

| Producto | Presentación | Identificación visible |
|---|---|---|
| Guantes, código `0029878` | Caja de 50 unidades, código `050` | `0029878/050` |
| Mismo producto | Caja de 100 unidades, código `100` | `0029878/100` |

Los códigos son texto y conservan ceros iniciales. **No hay conversión automática**
entre cajas, pares y unidades. Cantidad y costo corresponden a la presentación elegida.

Los buscadores permiten seleccionar coincidencias o crear proveedores/remitentes,
productos, presentaciones, modalidades y destinos dentro del mismo flujo. El NIT,
los códigos, la tarjeta y la presentación se recuperan al seleccionar registros.

### 4.2 Entradas

Cabecera: fecha, factura/forma de traslado, proveedor/remitente, modalidad y
observaciones generales. Detalle: presentación, tarjeta, lote, vencimiento,
cantidad, costo y observaciones por producto.

Se agregan varios renglones y se guarda el documento completo en una transacción.
Un mismo producto recibido en dos lotes ocupa dos renglones. Al elegir un lote
conocido se recupera su vencimiento; el costo se captura para esa recepción.
Un lote recibido a distinto costo mantiene capas de valoración separadas.

La entrada puede ser compra/traslado (`Entrada_Compra`) o recepción por donación
(`Entrada_Donacion`). Esta última solo afecta inventario.

### 4.3 Salidas

Cabecera: fecha de entrega, distrito/destino, referencia opcional y observaciones.
Detalle: varias presentaciones y cantidades.

El sistema propone lotes vigentes que vencen primero (**FEFO**, no PEPS por fecha
de recepción). Puede repartirse una cantidad entre varios lotes o elegirse uno
específico. El usuario revisa la distribución y confirma el documento.

Se reservan cantidades entre renglones del mismo documento y se comprueba otra vez
la disponibilidad al guardar. En fechas retroactivas se comprueba que no se consuman
recepciones futuras ni se dejen sin saldo movimientos posteriores.

### 4.4 Inventario inicial y reajustes

- **Inicial:** carga por presentación y lote a una fecha; documento `Inicial`,
  movimientos positivos de tipo `Reajuste`.
- **Reajuste:** lote existente, fecha, cantidad entera no nula y motivo obligatorio.
  Puede ser positivo o negativo. No puede dejar saldo negativo.
- Documento interno automático: `ENT-000001`, `SAL-000002`, `INI-000003` o
  `AJU-000004`, según tipo e identificador del documento.
- **Número de tarjeta:** identifica la presentación y se repite en sus movimientos;
  no es un identificador único de transacción.

## 5. Reportes y consultas

| Salida | Información / acceso |
|---|---|
| Historial kardex | Tipo, producto/presentación, tarjeta, lote, fecha, contraparte, documento, observaciones y cantidad; consulta de los últimos 1000 movimientos |
| Reporte de ingresos | Campos de la hoja de facturas: documento, NIT, proveedor, código, descripción, cantidad, costos, fecha, modalidad, presentación y observaciones |
| Tarjeta kardex | Movimientos de una presentación, entradas, salidas, reajustes, saldo acumulado y valor; rango de fechas con saldo anterior |
| Semáforo | Existencias por lote, vencimiento, tarjeta y valoración; Excel basado en plantilla |
| Descargo mensual | Saldo inicial, ingresos, salidas por distrito, saldo final, lotes, vencimientos y precios |
| Donaciones | Registros filtrados y monto calculado; Excel azul |
| Respaldo | Archivo `.sqlite` |

Los encabezados de ingresos y tarjeta se configuran en **Reportes / tarjeta**.
Los distritos originales corresponden al Excel; un destino nuevo conserva su nombre
y se agrupa en **Otros** en el descargo.

El semáforo usa rojo para menos de 180 días, amarillo entre 180 y 365 inclusive y
verde por encima de 365; sin fecha se clasifica verde. Los lotes vencidos quedan
rojos y no se proponen en salidas normales.

## 6. Persistencia y compatibilidad

El saldo se calcula sumando movimientos; no se almacena en una columna `saldo_lote`.
La normalización separa productos, presentaciones, lotes, documentos, contrapartes,
destinos y modalidades. En donaciones se separan ONG y registros documentales.

Se preservan identificadores y movimientos anteriores. No se inventan códigos de
presentación ni tarjetas faltantes; se completan desde el formulario. Las tablas
legadas de expedientes y los canales anteriores de kardex se conservan por
compatibilidad, pero no definen el nuevo flujo.

Ver [Base de datos](06-base-de-datos.md), [Diagramas UML](05-diagramas-uml.md),
[Flujo de inventario](flujo-inventario.md) y [Contexto técnico](00-contexto-sistema.md).
