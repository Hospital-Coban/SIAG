# Flujo del programa de donaciones

## 1. Alcance

El módulo conserva los datos de `resources/FORMATO PARA EL PROGRAMA DE DONACIONES .xls`
y agrega **Fecha de entrega de la donación**. Es documental e independiente de inventario.

No requiere un suministro del catálogo, tarjeta kardex, lote o vencimiento.
La descripción se escribe directamente en la donación.

## 2. Campos

El formulario, detalle y exportación comparten `CAMPOS_DONACION`, definido en
`src/shared/donaciones.js`.

| Orden en Excel | Campo | Captura |
|---|---|---|
| 1 | No. | Consecutivo generado en la exportación |
| 2 | Año de la donación | Año actual por defecto, editable |
| 3 | No. de expediente | Texto |
| 4 | ONG donante | Nombre: seleccionar existente o ingresar uno nuevo |
| 5 | Tipo de donación | Texto |
| 6 | Descripción de la donación | Texto obligatorio |
| 7 | Cantidad | Entero positivo obligatorio |
| 8 | Valor unitario en Q | Número no negativo obligatorio |
| 9 | Monto total en Q | Cantidad × valor unitario, no editable |
| 10 | No. de caso en Unidad de Cooperación Nacional e Internacional (UCNI) | Texto |
| 11 | Número de SIAD | Texto |
| 12 | Nombre del licenciado(a) que lleva el caso en UCNI | Texto |
| 13 | No. de carta de intención de donación | Texto |
| 14 | Fecha de la carta de intención de donación | Fecha |
| 15 | Dictamen técnico número | Texto |
| 16 | Fecha del dictamen técnico | Fecha |
| 17 | Número de la carta de agradecimiento del ministro | Texto |
| 18 | Fecha de la carta de agradecimiento del ministro | Fecha |
| 19 | No. de acta administrativa | Texto |
| 20 | Fecha de suscripción del acta | Fecha |
| 21 | No. de ingreso a almacén 1-H | Texto |
| 22 | Anexo utilizado | Texto |
| 23 | No. de oficio de entrega del expediente de donación | Texto |
| 24 | No. de acuerdo ministerial | Texto |
| 25 | Fecha de aprobación del acuerdo ministerial | Fecha |
| 26 | Código SIGES | Texto |
| 27 | Código SICOIN | Texto |
| 28 | Código único de registro (CUR) | Texto |
| 29 | Fecha de entrega de la donación | Fecha adicional, opcional |

El campo visible **Número de SIAD** conserva la clave interna `numero_siges` por
compatibilidad; es distinto del campo **Código SIGES** (`codigo_siges`).
Los números documentales se capturan como texto, no como cantidades.

## 3. Registrar o editar

1. Abrir **Donaciones → Registrar donación** o editar un registro existente.
2. En **ONG donante**, escribir el nombre y seleccionar una sugerencia si existe.
3. Si no existe, terminar de escribirlo. La interfaz indica que se creará al guardar.
4. Completar descripción, cantidad, valor unitario y los datos documentales disponibles.
5. Ingresar la fecha de entrega si se conoce y guardar.

La ONG guarda **solo nombre**. No se solicitan NIT, dirección, teléfono o contacto.
No proviene del catálogo de entidades de inventario.

Al guardar, el servicio normaliza espacios y compara sin mayúsculas ni acentos.
Por ejemplo, `Fundación Vida`, ` FUNDACION   VIDA ` y `fundación vida` reutilizan
la misma ONG. Se conserva el nombre canónico almacenado.

La creación/reutilización de ONG y el registro de la donación se ejecutan en una
transacción. Las fechas ingresadas se validan como fechas reales; la fecha de
entrega puede quedar vacía y no se sustituye por una fecha de inventario.

## 4. Búsqueda y filtros

- **Buscar:** búsqueda textual en los datos del registro.
- **Donante:** opciones obtenidas de las ONG de las donaciones registradas,
  identificadas por `id_ong`. No se incluyen entidades de inventario ni ONG sin registros.
- **Entrega desde / hasta:** intervalo inclusivo sobre `fecha_entrega`.
- Los filtros se combinan y **Limpiar filtros** restablece la lista.
- Con un rango activo, las donaciones sin fecha de entrega quedan fuera del resultado.
- Los controles usan la altura compacta; el donante usa `SelectBuscador size="sm"`.

## 5. Detalle, eliminación y exportación

**Ver** muestra los campos documentales y el monto calculado. **Eliminar** solicita
confirmación y elimina la donación; la ONG permanece disponible para futuros registros.
No elimina lotes o transacciones ni depende de movimientos del almacén.

**Exportar Excel** genera únicamente las filas filtradas con:

- 29 columnas en el orden indicado arriba.
- Tabla con encabezados azul oscuro y texto blanco en negrita.
- Filas alternadas blancas y azul claro, bordes y texto ajustado.
- Filtros en columnas y primera fila inmovilizada.
- Fechas `dd/mm/aaaa` y montos en Q con dos decimales.

La exportación se realiza con ExcelJS y permite elegir ruta mediante diálogo nativo.
Si no hay filas, el botón se deshabilita.

## 6. Datos anteriores

La migración de `programa_donaciones.id_entidad` a `id_ong` conserva identificadores,
fechas y datos y copia únicamente los nombres de entidades que estaban utilizados
en donaciones. Después del cambio no existe esa dependencia de entidades.

`expedientes_donacion` es una tabla histórica distinta; permanece en la base por
compatibilidad. El módulo actual no la importa de forma automática ni escribe allí.

Ver [Base de datos](06-base-de-datos.md) y [Contexto técnico](00-contexto-sistema.md).
