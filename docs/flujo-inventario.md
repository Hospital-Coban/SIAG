# Registro de inventario por documentos

Referencias: [descripción general](00-descripcion-sistema.md),
[base de datos](06-base-de-datos.md), [diagramas UML](05-diagramas-uml.md) y
[programa de donaciones independiente](flujo-donaciones.md).

En **Kardex e inventario**:

- **Registrar entrada**: fecha, factura/traslado, proveedor y modalidad una sola vez;
  agregar todas las presentaciones, lotes, vencimientos, cantidades, costos y observaciones.
- **Registrar salida**: fecha y destino una sola vez; agregar productos y cantidades.
  Revisar la propuesta de lotes antes de confirmar. Puede seleccionarse un lote específico.
- **Inventario inicial**: cargar las existencias conocidas a una fecha, por presentación y lote.
- **Reajuste**: corregir un lote con cantidad positiva o negativa y motivo obligatorio.

## Campos de los documentos

| Operación | Cabecera | Detalle por producto |
|---|---|---|
| Entrada | Fecha, tipo compra/traslado o recepción por donación, proveedor/remitente, NIT autocompletado, factura/traslado, modalidad y observaciones | Producto/presentación, tarjeta, lote, vencimiento, cantidad, costo unitario, total calculado y observaciones |
| Salida | Fecha de entrega, distrito/destino, referencia opcional y observaciones | Presentación, cantidad, disponibilidad, selección automática o específica de lote y observaciones |
| Inicial | Fecha, referencia y observaciones | Presentación, tarjeta, lote, vencimiento, cantidad y costo |
| Reajuste | Fecha, referencia y motivo obligatorio | Presentación, lote existente y cantidad positiva/negativa distinta de cero |

Una factura/entrega se registra completa: no se repiten sus datos generales por
producto. El tipo de entrada por donación afecta únicamente el almacén; no crea
un registro en el programa de donaciones.

Los buscadores permiten seleccionar coincidencias o **Crear nuevo** sin abandonar el documento.
El NIT, los códigos, la presentación y la tarjeta se recuperan del catálogo. Al elegir un
lote ya recibido se recupera el vencimiento; el costo se captura para la nueva recepción.

Para agregar una presentación a un producto conocido se selecciona el producto
existente en el formulario de creación o se escribe su código; el nombre se
recupera si coincide. **Guardar y seleccionar** devuelve el registro al renglón.
El buscador admite flechas y Enter para seleccionar, y Tab/Escape para cerrar.

## Producto, presentación y lote

Un producto tiene código y nombre; puede tener varias presentaciones con códigos propios.
Los códigos son texto y conservan ceros iniciales. Cada presentación tiene su tarjeta kardex,
niveles mínimo/máximo y existencias separadas. No hay conversiones automáticas entre cajas,
pares y unidades. La cantidad y el costo unitario corresponden a la presentación seleccionada.

La tarjeta de cada presentación se repite en sus movimientos. No debe confundirse
con la referencia externa o el número interno automático de documento:
`ENT-000001`, `SAL-000002`, `INI-000003` y `AJU-000004` son ejemplos ilustrativos.

Los suministros anteriores conservan sus identificadores y movimientos; no se inventan
códigos de presentación ni números de tarjeta. Se pueden completar desde **Datos de
presentación / niveles** en el renglón. Una presentación con movimientos no cambia de contenido.

Las recepciones del mismo lote a distinto costo conservan capas separadas de valoración.
La propuesta de salida utiliza primero los lotes vigentes que vencen antes, reserva cantidades
entre renglones y vuelve a validar al confirmar. También controla la disponibilidad histórica
cuando la fecha de salida es anterior a la fecha actual.

El saldo mostrado durante la captura es una referencia de la existencia actual
en lotes vigentes para la fecha elegida. La revisión y confirmación en el servicio
comprueban la disponibilidad histórica. Si el plan cambia antes de guardar, se
solicita revisarlo de nuevo. Un lote vencido puede retirarse mediante reajuste
justificado, pero no se propone en una entrega normal.

## Reportes

- **Reportes / tarjeta**: reporte de ingresos con los campos del Excel, tarjeta por presentación
  con movimientos y saldos, filtros de fecha y encabezados institucionales configurables.
- **Descargo mensual**: saldo inicial, ingresos, entregas por distrito, salidas y saldo final.
  Conserva al menos 25 líneas de productos (filas 2–26). Todas las líneas usadas
  repiten el patrón original de las filas 2 y 3, incluso después de la 180 y al
  agregar filas: A/B alternan relleno, D permanece coloreada y se conservan los
  bordes, fuentes, altura y formatos numéricos. Debajo de `max(25, registros)` se
  eliminan valores, fórmulas y todo el formato; el área de impresión termina allí.
- El inventario y el semáforo se alimentan de los mismos movimientos.
- El Excel semáforo utiliza solo los bloques necesarios, conservando completo el
  tamaño de cada uno y dejando vacíos sus espacios sin registros. Copia el bloque 3
  para las continuaciones y reserva espacio para el total y las firmas dentro del
  último bloque. Se limpian los bordes de todos los bloques que no se utilizan.
  Ver [formato de impresión del semáforo](reporte-semaforo.md).
- Los destinos iniciales corresponden a las columnas del Excel; destinos nuevos se clasifican
  en Otros conservando su nombre en el historial.

El reporte de ingresos contiene documento, NIT, proveedor, código, descripción,
cantidad, costo unitario/total, fecha, modalidad, presentación y observaciones.
La tarjeta contiene entradas, salidas, reajustes, lotes, vencimientos y saldos
acumulados; al filtrar fechas incluye el saldo anterior. Ambos se exportan con
tabla azul, formatos de fecha/moneda y encabezados fijos.

El historial visible consulta los últimos 1000 movimientos; la exportación de la
tarjeta consulta todos los movimientos de la presentación seleccionada. En el
descargo se agrupan los positivos del mes como ingresos y los negativos como
salidas; los reajustes sin destino se reflejan en Otros cuando son negativos.

Los documentos se guardan en una transacción: un error en cualquier renglón revierte todos
sus movimientos. El catálogo creado previamente permanece disponible aunque se cancele
el documento. El módulo de donaciones permanece independiente.

## Verificación

Con Node 22.13 o superior: `node scripts/verificar-documentos.mjs`.
La verificación usa SQLite en memoria y no modifica la base de la aplicación.

Para compilar main, preload y renderer: `npm run build`. Reiniciar la aplicación
después de cambios de esquema, servicios o preload.
