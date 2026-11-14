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

| Consulta / propósito                         | Comando y parámetros                   | Retorno                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| q6: recetas prolongadas con dispensa vencida | `pnpm q6` (sin parámetros adicionales) | Recetas de tratamiento prolongado vigentes con `proximaDispensa` anterior a hoy, con el cliente embebido en `cliente`; incluye clientes inactivos y ordena de la más atrasada a la más reciente. |

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
