# Semáforo: impresión dinámica por bloques

## Plantilla y generación

- Plantilla: `resources/Inventario Fisico Semaforo.xlsx`, hoja `SEMAFORO`.
- Exportación: `src/main/modules/inventario/semaforo.excel.js`.
- Distribución y estilos: `semaforo.formato.js` en el mismo directorio.
- La plantilla original no se modifica al exportar.

## Orden y cantidad de páginas

**Cada bloque utilizado conserva su tamaño, reservando dentro del último el total
y las firmas.** Primero se calcula ese espacio; solo el resto queda disponible
para productos y filas vacías. No se agrega una página de cierre independiente.

Con cuatro registros, el resultado ocupa un bloque hasta la fila 29:

| Filas | Contenido |
|---|---|
| 1–5 | Encabezado institucional y títulos |
| 6–9 | Los cuatro registros |
| 10–15 | Espacios vacíos con el formato de la tabla |
| 16 | Total |
| 17–29 | Separación y bloque de firmas; nombres en 25–26 |

Después de la fila 29 no quedan datos ni bordes de los bloques 2, 3 o 4.

Se conserva el orden de los modelos de la plantilla:

1. Bloque 1 hasta la fila 29, con encabezado obligatorio en filas 1–5.
2. Si hacen falta más espacios, bloque 2 hasta la fila 64.
3. Continuación con el bloque 3 y copias de 35 filas cuando se requieren.
4. Total y firmas dentro del final del último bloque utilizado.

El cierre ocupa 14 filas de la plantilla. Un solo bloque permite 10 productos;
dos bloques permiten 45; tres permiten 80. Cada continuación añade 35 espacios.
Los bloques anteriores al último disponen de sus espacios completos para productos;
el último reserva las 14 filas de cierre. Si se necesita otro bloque, se conserva
al menos un producto para ese último bloque, evitando una página solo de firmas.

Los espacios libres dentro de bloques utilizados conservan sus bordes y alturas.
Los bloques que no se utilizan se limpian explícitamente de valores y estilos,
incluidos sus bordes: quitar filas con `spliceRows` no eliminaba esos estilos.

Los modelos de continuación proceden de las filas 30–64 y 65–99. El tercer corte
se definió con 35 filas, igual que el segundo, porque no estaba guardado en la
plantilla. El cierre se copia desde las filas 119–132, preservando sus combinaciones
y nombres de firmas, y se coloca dentro del final del último bloque utilizado.

La columna `No.` continúa entre páginas sin reiniciarse. El total incluye todos
los registros, también los de los bloques adicionales. No quedan productos de
ejemplo ni fórmulas anteriores en las filas que quedan vacías.

## Impresión

- Columnas A–I, hasta el final de las firmas; orientación horizontal.
- Se conservan imagen, estilos, bordes, alturas y firmas de la plantilla.
- Colores de vencimiento en las filas de productos.
- Saltos manuales solo donde se necesitan páginas de continuación o de cierre.
- Papel de la plantilla, o Carta si no está especificado; escala inicial del 70 %,
  limitada por la altura disponible. No se usa «ajustar a N páginas».
- Pie `Página &P de &N` para numeración consecutiva.
- Título con fecha final del filtro o fecha actual.

La distribución se verifica en el Excel generado; la vista previa final también
depende del motor de impresión y del papel configurado en Excel. Para comprobar
cambios se debe exportar un archivo nuevo después de reiniciar la aplicación.

## Verificación

```bash
node scripts/verificar-semaforo.mjs
npm run build
```

El script prueba reportes vacíos, 4 y 10 registros, límites de bloques y reportes
grandes hasta 218 registros. Comprueba cortes XML, área de impresión, numeración,
totales, imagen, estilos y firmas. No modifica la plantilla ni la base de datos.
