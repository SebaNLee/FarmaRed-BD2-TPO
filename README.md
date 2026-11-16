# FarmaRed-BD2-TPO

## Members

Domínguez, Lautaro Ezequiel (L.65723)
Kim, Hwa Pyoung (L.62129)
Lee, Sebastían Nicolás (L.64675)
Pizzuto Beltran, Lorenzo (L.64123)

## Stack

- Node.js + TypeScript
- pnpm
- MongoDB
- Apache Cassandra
- Docker Compose
- GitHub Codespaces / Dev Containers

### Codespaces

1. Abrir este repositorio en GitHub e iniciar sesión con una cuenta con acceso a Codespaces.
2. Ir a **Code → Codespaces → ⋯ → New with options**, seleccionar la rama que se quiere probar y crear el Codespace. Ver la [guía de GitHub](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository?tool=webui).
3. Esperar a que termine la configuración del contenedor y el arranque de las bases. Cassandra puede tardar varios minutos; el arranque espera hasta 600 segundos.

La configuración de [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json) instala Node.js 26, pnpm 12.18.0 y Docker. Al crear el contenedor ejecuta `pnpm install --frozen-lockfile` y copia `.env.example` a `.env` si no existe. En cada inicio ejecuta `docker compose up -d --wait --wait-timeout 600` para levantar MongoDB y Cassandra.

El `.env` generado usa estos valores, adecuados para ejecutar los scripts desde la terminal del Codespace:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
MONGO_DB=farmared
CASSANDRA_CONTACT_POINTS=127.0.0.1:9042
CASSANDRA_LOCAL_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=farmared
TZ=America/Argentina/Buenos_Aires
```

MongoDB se inicia como replica set `rs0` para permitir transacciones. No hace falta cambiar los hosts a nombres de servicio ni publicar los puertos: los scripts se ejecutan dentro del Codespace. `.env` está excluido de Git.

En la terminal, desde la raíz del repositorio, verificar los servicios:

```bash
docker compose ps
pnpm db:check
```

Ambos servicios deben aparecer como `healthy` y `db:check` debe confirmar las dos conexiones. Después, ejecutar los comandos de [Cargar datos](#cargar-datos) y las consultas de la [tabla](#queries), por ejemplo `pnpm q1`.

Si la configuración inicial no terminó, se puede repetir desde la terminal:

```bash
pnpm install --frozen-lockfile
cp -n .env.example .env
docker compose up -d --wait --wait-timeout 600
pnpm db:check
```

Si un servicio no llega a estar disponible, revisar `docker compose logs mongo cassandra`. Para detener las bases, usar `docker compose down`; los datos se conservan en volúmenes mientras se conserve el Codespace.

### Data

### Queries

Requieren MongoDB levantado y `pnpm mongo:setup` / `pnpm mongo:load` ejecutados. q1–q15 tienen comandos pnpm que imprimen los resultados en consola. q8, q14 y q15 también usan Cassandra y requieren `pnpm cassandra:setup` / `pnpm cassandra:load`.

| Consulta / propósito                           | Comando y parámetros                                                                                                                                                                                               | Retorno                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| q1: productos activos con proveedor            | `pnpm q1` (sin parámetros adicionales)                                                                                                                                                                             | Productos activos con su `proveedor` embebido; incluye proveedores inactivos y ordena por nombre e ID.                                                                                                                                                                         |
| q2: ventas pendientes con farmacéutico         | `pnpm q2` (sin parámetros adicionales)                                                                                                                                                                             | ID, fecha y total de ventas pendientes, con el farmacéutico y su sucursal; ordena por fecha descendente e ID.                                                                                                                                                                  |
| q3: historial de un cliente                    | `pnpm q3 -- <clienteId>` (ID de cliente)                                                                                                                                                                           | Eventos `VENTA` (con detalles) y `RECETA` (por fecha de emisión), de todos los estados; ordena cronológicamente y desempata por tipo de evento e ID.                                                                                                                           |
| q4: clientes con más de una receta             | `pnpm q4` (sin parámetros adicionales)                                                                                                                                                                             | `cliente` y `cantidadRecetas`; incluye clientes inactivos y recetas de cualquier estado; ordena por cantidad descendente, apellido y nombre.                                                                                                                                   |
| q5: farmacéuticos activos con ventas recientes | `pnpm q5` (sin parámetros adicionales)                                                                                                                                                                             | `farmaceutico` y `cantidadVentasUltimos60Dias`; excluye ventas anuladas, incluye farmacéuticos sin ventas con 0 y ordena por cantidad descendente y apellido.                                                                                                                  |
| q6: recetas prolongadas con dispensa vencida   | `pnpm q6` (sin parámetros adicionales)                                                                                                                                                                             | Recetas de tratamiento prolongado vigentes con `proximaDispensa` anterior a hoy, con el cliente embebido en `cliente`; incluye clientes inactivos y ordena de la más atrasada a la más reciente.                                                                               |
| q7: top 5 productos más vendidos               | `pnpm q7` (sin parámetros adicionales)                                                                                                                                                                             | Los 5 productos con más unidades vendidas en ventas completadas, con sus datos y `unidadesVendidas`; incluye inactivos y desempata por ID.                                                                                                                                     |
| q8: lotes con menos de 50 unidades             | `pnpm q8` (sin parámetros adicionales)                                                                                                                                                                             | Lotes de Cassandra con `unidades` < 50, cada uno con su `producto`, `sucursal` y `proveedor` de MongoDB; incluye vencidos e inactivos y ordena por unidades ascendente.                                                                                                        |
| q9: ventas libres con total menor a $5000      | `pnpm q9` (sin parámetros adicionales)                                                                                                                                                                             | Ventas de tipo `Venta libre` con `total` < 5000, con sus detalles; excluye anuladas y ordena por total ascendente.                                                                                                                                                             |
| q10: clientes atendidos en una sucursal        | `pnpm q10 S002` (ID de sucursal)                                                                                                                                                                                   | Clientes sin duplicados; incluye inactivos y todos los estados de venta.                                                                                                                                                                                                       |
| q11: ingresos del mes actual por farmacéutico  | `pnpm q11` (sin parámetros adicionales)                                                                                                                                                                            | ID, nombre, apellido e ingresos de todos los farmacéuticos; suma ventas completadas y devuelve 0 si no tienen.                                                                                                                                                                 |
| q12: clientes sin ventas en el último año      | `pnpm q12` (sin parámetros adicionales)                                                                                                                                                                            | Clientes, incluidos inactivos y quienes nunca compraron; considera todos los estados de venta.                                                                                                                                                                                 |
| q13 alta: crear cliente con DNI único          | `pnpm q13 alta '{"nombre":"Ana","apellido":"Pérez","dni":"40123456","email":"ana@example.com","telefono":"1144556677","ciudad":"Rosario","provincia":"Santa Fe","obraSocial":"Sin cobertura","nroAfiliado":null}'` | Cliente activo con `id` secuencial generado (por ejemplo, `C019`); rechaza DNI duplicado.                                                                                                                                                                                      |
| q13 modificación: contacto y cobertura         | `pnpm q13 modificar <clienteId> '{"telefono":"1199887766"}'` (usar el `id` devuelto; JSON con email, telefono, ciudad, provincia, obraSocial o nroAfiliado)                                                        | Cliente actualizado; rechaza campos no permitidos y/o ID inexistente.                                                                                                                                                                                                          |
| q13 baja lógica: desactivar cliente            | `pnpm q13 baja <clienteId>` (usar el `id` devuelto)                                                                                                                                                                | Cliente con `activo: false`, sin eliminarlo; rechaza ID inexistente.                                                                                                                                                                                                           |
| q14: registrar una venta                       | `pnpm q14 '<venta JSON>'`; JSON con `clienteId`, `farmaceuticoId`, `medioPago`, `items: [{ productoId, cantidad }]`, `recetaId` cuando corresponda y `ventaId` opcional                                            | Con `ok: true`, devuelve `venta` completada e `idempotente`; calcula el total, descuenta stock FEFO y actualiza la dispensa de la receta si corresponde. Con `ok: false`, devuelve el código y los detalles del fallo.                                                         |
| q15: actualizar stock de una venta             | `pnpm q15 <ventaId>`; ID de una venta existente en estado `Completada`                                                                                                                                             | Con `ok: true`, devuelve `ventaId`, `movimientos` y `yaAplicado`; descuenta lotes no vencidos por FEFO en la sucursal del farmacéutico, con LWT para evitar stock negativo y sin repetir descuentos confirmados. Con `ok: false`, devuelve el código y los detalles del fallo. |

Ejemplo de q14 con un producto de venta libre:

```bash
pnpm q14 '{"clienteId":"C001","farmaceuticoId":"F001","medioPago":"Efectivo","items":[{"productoId":"PRD001","cantidad":1}]}'
```

Para productos bajo receta, agregar `recetaId` de una receta vigente del mismo cliente. Se puede indicar un `ventaId` estable para reintentar la misma operación.

Ejemplo de q15, reemplazando `<ventaId>` por el `venta.id` devuelto por q14:

```bash
pnpm q15 <ventaId>
```

Como q14 ya aplica el stock, q15 devuelve `yaAplicado: true` para esa venta y no vuelve a descontarlo. Ambos comandos imprimen el resultado en JSON y terminan con código de salida 1 si `ok` es `false`.

### Arquitectura

| Motor     | Datos                                                                                                                   | Motivo                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| MongoDB   | clientes, proveedores, productos, sucursales, farmacéuticos, recetas, ventas con detalle embebido y `operaciones_venta` | Documentos con estructura jerárquica, agregaciones, transacciones y coordinación de la operación |
| Cassandra | `stock_lotes` y `stock_movimientos`                                                                                     | Actualizaciones concurrentes por lote, FEFO por vencimiento y control de stock negativo con LWT  |

## Devs

### Entorno

Levantar compose:

```bash
pnpm install
cp -n .env.example .env
docker compose up -d --wait
pnpm db:check
```

Tirar compose

```bash
docker compose down
```

### Cargar datos

Flujo normal:

```bash
pnpm etl:validate

pnpm mongo:setup
pnpm mongo:load
pnpm mongo:check

pnpm cassandra:setup
pnpm cassandra:load
pnpm cassandra:check
```

Para reiniciar el stock:

```bash
pnpm cassandra:load --reset
```

### Scripts

| Script                 | Descripción                               |
| ---------------------- | ----------------------------------------- |
| `pnpm typecheck`       | Verificación de tipos                     |
| `pnpm lint`            | ESLint                                    |
| `pnpm format`          | Prettier                                  |
| `pnpm etl:validate`    | Parsea y valida los CSV provistos + extra |
| `pnpm db:check`        | Verifica conexión a Mongo y Cassandra     |
| `pnpm mongo:setup`     | Crea colecciones e índices                |
| `pnpm mongo:load`      | Carga entidades documentales en Mongo     |
| `pnpm mongo:check`     | Muestra conteos de Mongo                  |
| `pnpm cassandra:setup` | Crea keyspace y tablas de stock           |
| `pnpm cassandra:load`  | Carga los lotes en Cassandra              |
| `pnpm cassandra:check` | Muestra conteo y muestra FEFO             |

> **q14/q15:** q14 registra la venta `Completada` y q15 aplica stock FEFO con LWT; el stock se aplica antes del commit Mongo, así que si falla no queda venta ni receta modificada.
