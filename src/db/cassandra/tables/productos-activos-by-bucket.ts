import type { Client } from "cassandra-driver";

export const productosActivosByBucketTable = "productos_activos_by_bucket";

export async function setupProductosActivosByBucketTable(client: Client, keyspace: string): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${keyspace}.${productosActivosByBucketTable} (
      bucket int,
      producto_id text,
      producto_nombre text,
      principio_activo text,
      categoria text,
      presentacion text,
      condicion_venta text,
      precio_unitario decimal,
      proveedor_id text,
      proveedor_razon_social text,
      proveedor_cuit text,
      proveedor_tipo text,
      proveedor_ciudad text,
      proveedor_provincia text,
      proveedor_telefono text,
      proveedor_activo boolean,
      PRIMARY KEY ((bucket), producto_id)
    )
  `);
}
