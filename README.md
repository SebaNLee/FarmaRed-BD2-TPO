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

#### q01 — Productos activos con todos los datos de su proveedor

```bash
docker compose up -d --wait cassandra
pnpm cassandra:load
pnpm q01
```

## Devs

```bash
pnpm install
cp -n .env.example .env
docker compose up -d
docker compose down
```
