# Diagramas UML — Donaciones e inventario

Actor operativo: **Encargado de almacén**. Se muestra el flujo vigente de documentos
múltiples, independiente del programa de donaciones. Para el esquema físico,
incluidas columnas y relaciones legadas, ver [Base de datos](06-base-de-datos.md).

## 1. Casos de uso

```mermaid
flowchart LR
    EA[Encargado de almacén]
    subgraph DON[Programa de donaciones]
        D1[Registrar o editar donación]
        D2[Buscar o crear ONG por nombre]
        D3[Consultar detalle y eliminar]
        D4[Filtrar por texto, ONG y fecha de entrega]
        D5[Exportar registros filtrados]
        D1 --> D2
        D4 --> D5
    end
    subgraph INV[Inventario y kardex]
        I1[Registrar entrada de varios productos]
        I2[Registrar entrega a un destino]
        I3[Revisar lotes FEFO o elegir lote]
        I4[Buscar o crear catálogos]
        I5[Cargar inventario inicial]
        I6[Registrar reajuste con motivo]
        I7[Consultar existencias y semáforo]
        I8[Exportar ingresos, tarjeta y descargo]
        I1 --> I4
        I2 --> I3
        I2 --> I4
        I5 --> I4
    end
    EA --> D1
    EA --> D3
    EA --> D4
    EA --> I1
    EA --> I2
    EA --> I5
    EA --> I6
    EA --> I7
    EA --> I8
```

No hay inclusión entre registrar una donación documental y registrar una entrada
de inventario. Son operaciones independientes.

## 2. Clases y servicios

```mermaid
classDiagram
    class DonacionesService {
        +crear(datos)
        +listar()
        +obtener(id)
        +actualizar(id, datos)
        +eliminar(id)
        +listarOng()
        +guardarOng(nombre)
    }
    class OngDonante {
        +id_ong
        +nombre
        +nombre_normalizado
    }
    class ProgramaDonacion {
        +id_expediente
        +id_ong
        +fecha_entrega
        +datosJSON
    }
    class DocumentosService {
        +catalogos()
        +crearCatalogo(tipo, datos)
        +previsualizar(datos)
        +planSalida(lineas, fecha)
        +guardar(datos)
        +reajustar(datos)
        +reporte()
        +tarjeta(id_suministro)
        +configurar(datos)
    }
    class Producto {
        +id_producto
        +codigo
        +nombre
    }
    class Presentacion {
        +id_suministro
        +id_producto
        +codigo_presentacion
        +cantidad_unitaria
        +numero_tarjeta
        +minimo
        +maximo
    }
    class Documento {
        +id_documento
        +numero
        +tipo
        +fecha
        +referencia
        +observaciones
    }
    class Lote {
        +id_lote
        +numero_lote
        +fecha_vencimiento
        +precio_unitario
    }
    class Movimiento {
        +id_transaccion
        +id_documento
        +id_lote
        +numero_kardex
        +cantidad
        +observaciones
    }
    class InventarioService {
        +saldo()
        +listarLotes(id_suministro)
        +reporteInventario(filtros)
        +proximosVencer(dias)
    }
    DonacionesService --> OngDonante : resuelve nombre
    DonacionesService --> ProgramaDonacion : mantiene
    OngDonante "1" --> "0..*" ProgramaDonacion : donante
    Producto "1" --> "0..*" Presentacion : variantes
    Presentacion "1" --> "0..*" Lote : existencias
    Documento "0..1" --> "0..*" Movimiento : agrupa
    Lote "1" --> "0..*" Movimiento : saldo calculado
    DocumentosService --> Documento : guarda completo
    DocumentosService --> Movimiento : registra
    InventarioService --> Movimiento : suma cantidades
```

Los registros anteriores pueden no tener producto o documento vinculado hasta
su migración/completado. El saldo de lote es derivado, no atributo persistido.
Una capa de lote representa además el costo de recepción.

## 3. Secuencia — Registrar donación

```mermaid
sequenceDiagram
    actor E as Encargado
    participant UI as Donaciones.jsx
    participant IPC as donaciones.controller
    participant S as DonacionesService
    participant DB as SQLite
    E->>UI: Completa campos del formato y nombre de ONG
    UI->>IPC: donaciones:crear
    IPC->>S: crear(datos)
    S->>S: Validar datos
    S->>DB: BEGIN
    S->>DB: Buscar o insertar ONG por nombre normalizado
    S->>DB: INSERT programa_donaciones con id_ong
    alt Error
        S->>DB: ROLLBACK
        S-->>UI: Mensaje de error
    else Correcto
        S->>DB: COMMIT
        S-->>UI: Donación guardada
    end
```

No participan servicios de inventario, lotes ni movimientos.

## 4. Secuencia — Entrada con varios productos

```mermaid
sequenceDiagram
    actor E as Encargado
    participant UI as DocumentoInventario
    participant IPC as inventario:documentos
    participant S as DocumentosService
    participant DB as SQLite
    E->>UI: Fecha, proveedor, documento y modalidad
    E->>UI: Agregar presentaciones, lotes, cantidades y costos
    opt Falta un dato de catálogo
        UI->>IPC: crearCatalogo
        IPC->>S: crearCatalogo(tipo, datos)
        S->>DB: Crear o reutilizar registro
        S-->>UI: Registro seleccionado
    end
    UI->>IPC: guardar(documento con lineas)
    IPC->>S: guardar(datos)
    S->>DB: BEGIN
    S->>DB: INSERT cabecera y asignar ENT-id
    loop Cada renglón
        S->>S: Validar presentación, tarjeta, cantidad, costo y vencimiento
        S->>DB: Resolver o crear capa de lote
        S->>DB: INSERT movimiento positivo con id_documento
    end
    alt Error en cualquier renglón
        S->>DB: ROLLBACK de todo el documento
        S-->>UI: Error y conservación del formulario
    else Documento válido
        S->>DB: COMMIT
        S-->>UI: Número interno del documento
    end
```

Crear catálogos es una operación independiente: esos registros permanecen aunque
se cancele o falle el documento posterior.

## 5. Secuencia — Salida con revisión de lotes

```mermaid
sequenceDiagram
    actor E as Encargado
    participant UI as DocumentoInventario
    participant S as DocumentosService via IPC
    participant DB as SQLite
    E->>UI: Fecha, destino y productos con cantidades
    UI->>S: previsualizar(datos)
    S->>DB: Consultar lotes y movimientos
    S->>S: FEFO vigente, disponibilidad histórica y reservas entre renglones
    S-->>UI: Propuesta de lotes y cantidades
    E->>UI: Revisar y confirmar
    UI->>S: guardar(datos, firma del plan)
    S->>DB: BEGIN
    S->>S: Recalcular plan y comparar firma
    alt Falta stock o cambia el plan
        S->>DB: ROLLBACK
        S-->>UI: Solicitar nueva revisión
    else Plan válido
        S->>DB: INSERT documento SAL-id
        loop Cada lote utilizado
            S->>DB: INSERT movimiento negativo
        end
        S->>DB: COMMIT
        S-->>UI: Entrega completa guardada
    end
```

## 6. Casos de uso y resultados

| Caso | Resultado / regla |
|---|---|
| Registrar/editar donación | Solo programa de donaciones; ONG por nombre, monto calculado |
| Eliminar donación | Elimina el registro documental, conserva ONG e inventario |
| Filtrar donaciones | Texto + ONG con registros + fecha de entrega, no fecha de movimiento |
| Exportar donaciones | 29 columnas, incluido consecutivo y fecha de entrega, solo filas filtradas |
| Crear presentación | Código base + código de presentación; tarjeta y niveles; saldo independiente |
| Completar presentación anterior | Conserva ID e historial; no cambia contenido si tiene movimientos |
| Registrar entrada | Cabecera única y todos los productos en una transacción |
| Registrar salida | Destino único y varias presentaciones; revisión y revalidación de lotes |
| Cargar inicial | Documento INI con movimientos positivos de reajuste por lote |
| Reajustar | Cantidad entera no nula, lote existente y motivo obligatorio |
| Exportar tarjeta | Movimientos cronológicos, saldo anterior, saldo acumulado y valoración |
| Exportar descargo | Corte mensual y entregas agrupadas por distrito/otros |

## 7. Relaciones activas

```mermaid
erDiagram
    ong_donantes ||--o{ programa_donaciones : donante
    inventario_productos o|--o{ cat_suministros : presentaciones
    cat_suministros ||--o{ inventario_lotes : capas_de_lote
    inventario_lotes ||--o{ transacciones_kardex : movimientos
    inventario_documentos o|--o{ transacciones_kardex : agrupa
    cat_entidades o|--o{ inventario_documentos : contraparte
    cat_destinos o|--o{ inventario_documentos : entrega
    inventario_modalidades o|--o{ inventario_documentos : modalidad
```

La FK única de la tabla histórica `expedientes_donacion` a un movimiento se conserva
por compatibilidad, pero no forma parte de estas relaciones activas ni del nuevo CRUD.

## 8. Reglas transversales

- Cantidades de entrada/salida enteras positivas; reajustes enteros distintos de cero.
- Costos no negativos; totales calculados según presentación y capa de costo.
- Tarjeta por presentación, número interno por documento y referencia externa separados.
- Selección automática por vencimiento (**FEFO**), con opción de lote específico.
- Validación de stock entre renglones y en fechas retroactivas.
- Sin conversión automática entre presentaciones.
- Sin efectos cruzados entre donaciones documentales e inventario.
- Donantes con solo nombre; sin NIT, contacto ni campos adicionales.
