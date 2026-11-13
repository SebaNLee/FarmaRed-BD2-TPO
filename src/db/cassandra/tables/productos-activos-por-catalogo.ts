import type { Client } from "cassandra-driver";

export const productosActivosPorCatalogoTable = "productos_activos_por_catalogo";

export async function setupProductosActivosPorCatalogoTable(client: Client, keyspace: string): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${keyspace}.${productosActivosPorCatalogoTable} (
      catalogo text,
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
      PRIMARY KEY ((catalogo), producto_id)
    )
  `);
}
