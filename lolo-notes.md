# FarmaRed — notas del proyecto

## Flujo de q01

Carga:

```text
CSV -> parsers y validaciones -> mapper producto + proveedor
    -> repository -> tabla Cassandra
```

Query:

```text
Comando q01 -> función q01 -> repository -> Cassandra -> JSON

pnpm q01
  -> scripts/q01.ts                          coordina la consulta
     -> config/cassandra.ts                  abre la conexión
     -> queries/q01.ts                       recibe el repository
        -> repositories/cassandra/farmared-repository.ts
           -> getProductosActivos()          ejecuta SELECT y lee todas las páginas
        <- filas con los datos de producto y proveedor
        -> q01 arma los productos con el objeto proveedor embebido
     <- arreglo de productos listo para mostrar
     -> el script imprime JSON y cierra la conexión
```

El setup crea la tabla; el loader prepara los datos; el repository ejecuta CQL;
la función q01 arma el resultado con el proveedor embebido.

## Diseño y comportamiento de q01

`q01(repository)` devuelve un arreglo de productos activos con el objeto `proveedor`
completo, ordenado por ID de producto. Usa Cassandra y la tabla
`farmared.productos_activos_por_catalogo`, con una copia de los datos del proveedor
en cada fila. No excluye proveedores inactivos. Esta duplicación permite resolver
q01 sin joins y es adecuada para el catálogo y los proveedores, que según la consigna
se leen frecuentemente y cambian poco.

La carga valida los CSV provistos y reconstruye la partición `catalogo = 'farmared'`, incluyendo
solo productos activos.

La consulta ejecutada es:

```sql
SELECT * FROM farmared.productos_activos_por_catalogo WHERE catalogo = 'farmared';
```
