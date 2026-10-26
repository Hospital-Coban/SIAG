# Contexto técnico — Inventario Hospitalario

## 1. Referencias

- [Descripción general](00-descripcion-sistema.md): alcance y reglas.
- [Base de datos](06-base-de-datos.md): esquema físico y compatibilidad.
- [Diagramas UML](05-diagramas-uml.md): relaciones y secuencias.
- [Donaciones](flujo-donaciones.md) e [Inventario](flujo-inventario.md): operación.

El programa usa Electron + React + SQLite. El actor operativo de estos flujos es
el encargado de almacén. Donaciones e inventario tienen persistencia y catálogos
independientes; no hay creación automática cruzada de registros.

## 2. Componentes principales

| Responsabilidad | Archivos |
|---|---|
| Pantalla de donaciones | `src/renderer/src/pages/Donaciones.jsx` |
| Campos y normalización de ONG | `src/shared/donaciones.js` |
| CRUD de donaciones y ONG | `src/main/modules/donaciones/donaciones.service.js` |
| Historial y acceso a formularios de inventario | `src/renderer/src/pages/Kardex.jsx` |
| Entrada/salida/inicial con varios renglones | `src/renderer/src/components/DocumentoInventario.jsx` |
| Buscador reutilizable con creación integrada | `src/renderer/src/components/BuscarCrear.jsx` |
| Selector reutilizable; admite `size="sm"` | `src/renderer/src/components/SelectBuscador.jsx` |
| Reportes, filtros y encabezados institucionales | `src/renderer/src/components/ReportesInventario.jsx` |
| Catálogos, planificación FEFO y documentos | `src/main/modules/kardex/documentos.service.js` |
| Esquema adicional y vinculación de suministros | `src/main/modules/kardex/documentos.schema.js` |
| Consultas de historial y API anterior | `src/main/modules/kardex/kardex.service.js` |
| Saldos, lotes y semáforo | `src/main/modules/inventario/inventario.service.js` |
| Datos del descargo mensual | `src/main/modules/inventario/descargo.datos.js` |
| Excel de ingresos y tarjeta | `src/shared/inventario.excel.js` |
| Excel basado en plantillas | `src/main/modules/inventario/semaforo.excel.js`, `descargo.excel.js` |
| Bloques, copias y firmas del semáforo | `src/main/modules/inventario/semaforo.formato.js` |
| Umbrales de vencimiento | `src/shared/semaforo.js` |

## 3. IPC y API del preload

Los controladores responden normalmente `{ ok: true, data }` o
`{ ok: false, error }`. Los diálogos cancelados de exportación devuelven
`data.cancelado: true`.

### Donaciones

| Método `window.api.donaciones` | Canal |
|---|---|
| `crear(datos)` | `donaciones:crear` |
| `listar()` | `donaciones:listar` |
| `obtener(id)` | `donaciones:obtener` |
| `actualizar(id, datos)` | `donaciones:actualizar` |
| `eliminar(id)` | `donaciones:eliminar` |
| `listarOng()` | `donaciones:ong-listar` |
| `exportarExcel(buffer, nombre)` | `donaciones:exportar-excel` |

Las ONG se resuelven por nombre al crear/editar una donación. No se consultan
entidades ni suministros para completar estos registros.

### Documentos de inventario

`window.api.inventario.documentos(accion, datos)` invoca `inventario:documentos`,
registrado en `kardex.controller.js`.

| Acción | Entrada / resultado |
|---|---|
| `catalogos` | Productos, presentaciones, entidades de recepción, destinos, modalidades, lotes y configuración |
| `crearCatalogo` | `tipo`: proveedor, destino, modalidad o presentación; devuelve el registro creado/reutilizado |
| `previsualizar` | Fecha y renglones de salida; devuelve distribución por lotes |
| `guardar` | Documento con renglones; salida requiere firma de la propuesta revisada |
| `reajustar` | Fecha, lote, cantidad, motivo y referencia opcional |
| `reporte` | Renglones de documentos con datos para el reporte de ingresos |
| `tarjeta` | `id_suministro`; devuelve presentación y movimientos con saldos acumulados |
| `configurar` | Guarda encabezados institucionales en `configuracion` |

La firma de confirmación contiene por renglón los pares `[id_lote, cantidad]`.
El servicio vuelve a calcular el plan dentro de la transacción de guardado y lo
compara con la firma recibida. Si cambió, exige revisar nuevamente.

### Consultas y exportaciones de inventario

| API / canal | Función |
|---|---|
| `window.api.kardex.listar` / `kardex:listar` | Historial con filtro de tipo/suministro; límite de 1000 |
| `inventario:saldo` | Existencias por presentación |
| `inventario:lotes-listar` | Lotes y saldos calculados |
| `inventario:proximos-vencer` | Lotes con saldo, no vencidos, horizonte predeterminado de 90 días |
| `inventario:reporte` | Datos del inventario físico |
| `inventario:exportar-semaforo` | Excel semáforo |
| `inventario:exportar-descargo` | Excel mensual por distrito |
| `window.api.inventario.exportarExcel` / `inventario:exportar-archivo` | Guardar Excel de ingresos o tarjeta |

Los canales `kardex:registrar-entrada`, `kardex:registrar-salida` y
`kardex:registrar-reajuste` siguen disponibles como API anterior de movimientos
individuales. Los nuevos formularios usan `DocumentosService`.

## 4. Atomicidad y normalización

- Donaciones: validación, resolución/creación de ONG y persistencia del registro.
- Inventario: cabecera, lotes/capas de costo y todos los movimientos se guardan
  juntos; cualquier error revierte el documento completo.
- Los catálogos creados desde el formulario se guardan mediante una operación
  separada y permanecen disponibles aunque se cancele el documento.
- La salida reserva cantidades entre renglones, excluye vencidos y valida fechas
  retroactivas. Un lote puede utilizarse en varios renglones sin sobreasignación.
- Los nuevos destinos se comparan normalizando nombre; modalidades y ONG también
  tienen claves de búsqueda normalizadas. Proveedores se reutilizan por NIT o nombre.
- El saldo se deriva de `SUM(transacciones_kardex.cantidad)`; no se actualiza una
  columna de existencias en cada operación.

## 5. Fuentes de formatos

- `resources/FORMATO PARA EL PROGRAMA DE DONACIONES .xls`: campos de donaciones.
- `INFO PARA PROGRAMA.xlsx`: archivo original de referencia con hojas de ingresos,
  semáforo y descargo.
- `resources/Inventario Fisico Semaforo.xlsx`: plantilla utilizada para exportar
  el semáforo, hoja `SEMAFORO`; conserva el contenido y formato del archivo anterior.
- `Kardex.jpeg`: referencia de tarjeta de control de suministros.
- Las plantillas de exportación concretas se resuelven en los generadores de
  semáforo y descargo; no todos los Excel de referencia se importan como datos.

## 6. Verificación

```bash
node scripts/verificar-documentos.mjs
node scripts/verificar-semaforo.mjs
npm run build
```

La verificación requiere Node 22.13 o superior y usa `node:sqlite` en memoria con
un adaptador de transacciones para ejercitar los servicios. La aplicación utiliza
`better-sqlite3` dentro de Electron.

Cubre catálogos, códigos con ceros, presentaciones, documentos múltiples, rollback,
salidas repartidas, reservas, fechas retroactivas, costos por recepción, inventario
inicial, reajustes, migración de catálogos y lectura de los Excel generados. No
modifica la base de datos del usuario. La compilación valida main, preload y renderer.
