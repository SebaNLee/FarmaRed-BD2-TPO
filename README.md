# FarmaRed-BD2-TPO

## Members

<!-- TODO -->

## Stack

- Node.js + TypeScript
- pnpm
- MongoDB
- Apache Cassandra
- Docker Compose
- GitHub Codespaces / Dev Containers

### Codespaces

<!-- TODO guia devcontainers -->

### Data

### Queries

Requieren MongoDB levantado y `pnpm mongo:setup` / `pnpm mongo:load` ejecutados. Todas usan MongoDB, reciben `db` en sus funciones y los scripts imprimen el resultado en JSON.

| Consulta / propósito                          | Comando y parámetros                                                                                                                                                                                                           | Retorno                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| q10: clientes atendidos en una sucursal       | `pnpm q10 S002` (ID de sucursal)                                                                                                                                                                                               | Clientes sin duplicados; incluye inactivos y todos los estados de venta.                                       |
| q11: ingresos del mes actual por farmacéutico | `pnpm q11` (sin parámetros adicionales)                                                                                                                                                                                        | ID, nombre, apellido e ingresos de todos los farmacéuticos; suma ventas completadas y devuelve 0 si no tienen. |
| q12: clientes sin ventas en el último año     | `pnpm q12` (sin parámetros adicionales)                                                                                                                                                                                        | Clientes, incluidos inactivos y quienes nunca compraron; considera todos los estados de venta.                 |
| q13 alta: crear cliente con DNI único         | `pnpm q13 alta '{"id":"C100","nombre":"Ana","apellido":"Pérez","dni":"40123456","email":"ana@example.com","telefono":"1144556677","ciudad":"Rosario","provincia":"Santa Fe","obraSocial":"Sin cobertura","nroAfiliado":null}'` | Cliente creado y activo; rechaza DNI o ID duplicados.                                                          |
| q13 modificación: contacto y cobertura        | `pnpm q13 modificar C100 '{"telefono":"1199887766"}'` (ID y JSON con email, telefono, ciudad, provincia, obraSocial o nroAfiliado)                                                                                             | Cliente actualizado; rechaza campos no permitidos y/o ID inexistente.                                          |
| q13 baja lógica: desactivar cliente           | `pnpm q13 baja C100` (ID de cliente)                                                                                                                                                                                           | Cliente con `activo: false`, sin eliminarlo; rechaza ID inexistente.                                           |

### Arquitectura

| Motor     | Datos                                                                                              | Motivo                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| MongoDB   | clientes, proveedores, productos, sucursales, farmacéuticos, recetas y ventas con detalle embebido | Documentos con estructura jerárquica, agregaciones y consultas por múltiples atributos          |
| Cassandra | `stock_lotes` y `stock_movimientos`                                                                | Actualizaciones concurrentes por lote, FEFO por vencimiento y control de stock negativo con LWT |

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
