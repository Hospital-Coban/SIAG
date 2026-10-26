# Documentación del sistema

Documentación actualizada de los módulos de donaciones e inventario.

| Documento | Contenido |
|---|---|
| [Descripción general](00-descripcion-sistema.md) | Alcance, módulos, arquitectura, reglas y reportes |
| [Contexto técnico](00-contexto-sistema.md) | Componentes, servicios, IPC y verificación |
| [Diagramas UML](05-diagramas-uml.md) | Casos de uso, clases, secuencias y relaciones actuales |
| [Base de datos](06-base-de-datos.md) | Tablas, restricciones, saldos calculados y migraciones |
| [Flujo de donaciones](flujo-donaciones.md) | Campos del formato, ONG, filtros y exportación |
| [Flujo de inventario](flujo-inventario.md) | Entradas y salidas múltiples, catálogos y reportes |
| [Impresión del semáforo](reporte-semaforo.md) | Bloques ordenados, páginas adicionales y cierre con firmas |

## Distinción principal

**Donaciones e inventario son módulos independientes.** Registrar una donación no
crea existencias; recibir una donación en inventario no crea un expediente en el
programa de donaciones. Sus catálogos de donantes y contrapartes también son distintos.

Los documentos describen el comportamiento implementado. Las tablas y canales
anteriores conservados por compatibilidad se identifican explícitamente como legados.
