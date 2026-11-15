<!-- TODO borrar, AI gen de guía -->

# Arquitectura de persistencia — FarmaRed

## 1. Decisión

El sistema usa dos motores NoSQL con paradigmas distintos:

| Motor            | Paradigma              | Entidades                                                                                  |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| MongoDB          | Documentos             | `clientes`, `proveedores`, `productos`, `sucursales`, `farmaceuticos`, `recetas`, `ventas` |
| Apache Cassandra | Columnar / wide-column | `stock_lotes`, `stock_movimientos`                                                         |

La separación no es arbitraria: cada motor resuelve un patrón de acceso distinto.

## 2. Por qué Mongo para el dominio documental

- Las ventas tienen una cabecera y un detalle de longitud variable; el detalle se embebe en el documento de venta.
- Se consultan por cliente, farmacéutico, estado y rango de fechas.
- Se necesitan agregaciones (`$lookup`, `$group`, `$match`) y filtros por atributos que no forman parte de una clave.
- El catálogo y los proveedores cambian poco y se leen mucho.

## 3. Por qué Cassandra para el stock

El enunciado describe el stock como:

> “Actualizaciones frecuentes y potencialmente concurrentes. Requiere evitar stock negativo y priorizar lotes por vencimiento.”

Cassandra resuelve eso con:

- partición por `(sucursal_id, producto_id)`;
- clustering por `vencimiento` y `lote_id` (FEFO);
- LWT (`IF unidades = ?`) para que dos ventas concurrentes no dejen stock negativo. Como `unidades` no es una columna _counter_, Cassandra no permite `unidades = unidades - ?`: se lee el valor actual y se hace un compare-and-set contra ese valor.
- escrituras distribuidas por partición.

### 3.1 `stock_lotes`

```sql
CREATE TABLE farmared.stock_lotes (
  sucursal_id text,
  producto_id text,
  vencimiento date,
  lote_id text,
  nro_lote text,
  unidades int,
  PRIMARY KEY ((sucursal_id, producto_id), vencimiento, lote_id)
) WITH CLUSTERING ORDER BY (vencimiento ASC, lote_id ASC);
```

Consulta FEFO:

```sql
SELECT lote_id, nro_lote, unidades, vencimiento
FROM farmared.stock_lotes
WHERE sucursal_id = ? AND producto_id = ? AND vencimiento >= ?;
```

El orden de clustering ya devuelve los lotes del más próximo a vencer al más lejano.

### 3.2 `stock_movimientos`

```sql
CREATE TABLE farmared.stock_movimientos (
  venta_id text,
  lote_id text,
  sucursal_id text,
  producto_id text,
  vencimiento date,
  cantidad int,
  unidades_antes int,
  unidades_despues int,
  estado text,
  actualizado_en timestamp,
  PRIMARY KEY ((venta_id), lote_id)
);
```

Estados:

- `PENDIENTE`: la operación comenzó pero no se confirmó. **No significa “no aplicado”**: significa “resultado desconocido”.
- `APLICADO`: el descuento se realizó.
- `REVERTIDO`: la compensación se realizó.

Esta tabla no es una de las 15 consultas: es un ledger interno para idempotencia, auditoría y compensación.

`unidades_antes` y `unidades_despues` guardan la evidencia del CAS. Si un movimiento queda `PENDIENTE` por un timeout, el reconciliador puede comparar el lote actual con esos valores para intentar resolverlo; si hay concurrencia y no coincide ninguno, queda `INDETERMINADO` para revisión.

## 4. Matriz entidad → motor

| Entidad / caso              | Motor     | Modelo                                      |
| --------------------------- | --------- | ------------------------------------------- |
| Clientes                    | Mongo     | Colección `clientes`, DNI único             |
| Proveedores                 | Mongo     | Colección `proveedores`                     |
| Productos                   | Mongo     | Colección `productos`, `proveedorId`        |
| Sucursales                  | Mongo     | Colección `sucursales`                      |
| Farmacéuticos               | Mongo     | Colección `farmaceuticos`                   |
| Recetas                     | Mongo     | Colección `recetas`                         |
| Ventas + detalle            | Mongo     | Documento con `detalles` embebidos          |
| Operaciones de coordinación | Mongo     | `operaciones_venta`, idempotencia y bloqueo |
| Stock actual                | Cassandra | `stock_lotes`                               |
| Movimientos de stock        | Cassandra | `stock_movimientos`                         |

## 5. Relaciones entre motores

Mongo y Cassandra no comparten transacciones. Las relaciones se resuelven así:

- **q01**: Mongo `$lookup` de `productos` a `proveedores`.
- **q08**: Cassandra devuelve los lotes con menos de 50 unidades; la aplicación busca producto y proveedor en Mongo y combina.
- **q14/q15**: la venta y la receta se escriben en Mongo **después** de aplicar el stock en Cassandra. La coordinación es una saga orquestada con compensación. La venta `Completada` es el marcador de commit; el stock se aplica antes para no tener que compensar documentos de negocio.

## 6. q14/q15 y consistencia

Flujo simplificado (stock primero):

```
1. Validar venta, cliente, farmacéutico, sucursal, productos y receta (Mongo).
2. Crear/retomar una operación de coordinación en `operaciones_venta` (Mongo).
3. Para cada ítem, leer lotes FEFO en stock_lotes.
4. Por cada lote:
   a. INSERT stock_movimientos ... IF NOT EXISTS  (PENDIENTE)
   b. UPDATE stock_lotes ... SET unidades = ? IF unidades = ?   (CAS con LWT)
   c. UPDATE stock_movimientos ... estado = APLICADO
5. Transacción Mongo: insertar venta Completada + actualizar receta + marcar operación CONFIRMADA.
6. Si falla algo antes del commit, revertir los movimientos APLICADOS en orden inverso y marcar la operación ABORTADA.
```

La tabla `stock_movimientos` permite que un reintento no descuente dos veces y que la compensación sepa qué lotes reponer. La colección `operaciones_venta` es un registro mínimo de coordinación: `PENDIENTE`, `CONFIRMADA` o `ABORTADA`, con `_id = ventaId` y `bloqueo`. No guarda el payload de la venta, ni snapshots de receta, ni el estado del stock; eso vive en `ventas`, `recetas`, `stock_lotes` y `stock_movimientos`. No es una venta ni reemplaza al estado de negocio `Completada`/`Pendiente`/`Anulada`.

### 6.1 Niveles de consistencia

| Entorno                | Configuración                                                           |
| ---------------------- | ----------------------------------------------------------------------- |
| Desarrollo (este repo) | RF=1, `LOCAL_QUORUM` para lecturas/escrituras y `LOCAL_SERIAL` para LWT |
| Producción             | RF=3, `NetworkTopologyStrategy`, `LOCAL_QUORUM` y `LOCAL_SERIAL`        |

Con RF=1 hay una sola copia: no hay réplicas atrasadas, pero tampoco tolerancia a fallos. El código usa `LOCAL_QUORUM`/`LOCAL_SERIAL` para que la configuración sea correcta si se sube el RF.

Bajo CAP, el stock se diseña del lado **CP**: ante una partición se prefiere rechazar la operación antes que permitir stock negativo o leer un estado viejo.

## 7. q08: un caso que Cassandra no hace bien

q08 pide lotes con menos de 50 unidades, con producto, sucursal y proveedor.

- `unidades` no es clave de partición ni de clustering.
- La partition key es `(sucursal_id, producto_id)`: no se puede consultar solo por sucursal.
- El join con producto y proveedor es entre motores.

Solución del TPO:

```
SELECT * FROM stock_lotes;
filtrar unidades < 50 en la aplicación;
buscar productos y proveedores en Mongo;
combinar.
```

Es aceptable por el volumen del trabajo (30 lotes) y porque q08 es un reporte. **q08 no justifica Cassandra**; la justificación es q15. A escala se evaluaría una tabla desnormalizada de alertas o un motor analítico.

## 8. Alternativas evaluadas

| Alternativa                                       | Motivo de descarte                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Stock en Mongo                                    | No aprovecha el caso columnar ni el LWT; el stock queda en el mismo motor que el resto |
| Stock en ambos motores                            | Doble fuente de verdad y riesgo de deriva                                              |
| `stock_bajo` en Cassandra mantenida en cada venta | Doble escritura y compensación extra; no se justifica para el volumen del TPO          |
| `ALLOW FILTERING` para q08                        | Sigue siendo un scan, pero del lado del servidor y con riesgo de timeout               |
| Transacción distribuida Mongo–Cassandra           | No existe; se resuelve con saga y compensación                                         |

## 9. Limitaciones

- RF=1 en desarrollo: sin tolerancia a fallos.
- La ventana entre el descuento de stock y el `APLICADO` puede dejar un `PENDIENTE` ambiguo; se documenta y se resuelve con `reconciliarOperaciones` o revisión manual.
- El stock se descuenta antes de que la venta exista: q08 y los reportes de stock pueden ver una baja temporaria. Es el lado seguro para no sobrevender.
- `operaciones_venta` conserva operaciones `ABORTADA` como auditoría; no son ventas.
- q08 hace un scan completo.
- La saga es de tipo at-least-once con operaciones idempotentes; no hay exactly-once.
- q15 público sobre una venta preexistente que falla no cambia el estado de negocio de la venta; es un servicio de stock.
