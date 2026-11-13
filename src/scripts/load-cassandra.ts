import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { setupCassandraDatabase } from "../db/cassandra/setup.js";
import { loadFarmaRedData } from "../etl/load-data.js";
import { validateData } from "../etl/validators/index.js";
import { CassandraFarmaRedRepository } from "../repositories/cassandra/farmared-repository.js";
import { toProductosActivosPorCatalogoRow } from "../repositories/cassandra/mappers/productos-activos-por-catalogo.js";

async function main(): Promise<void> {
  const data = await loadFarmaRedData();
  validateData(data);
  const proveedores = new Map(data.proveedores.map((proveedor) => [proveedor.id, proveedor]));
  const rows = data.productos
    .filter((producto) => producto.activo)
    .map((producto) => {
      const proveedor = proveedores.get(producto.proveedorId);
      if (!proveedor) {
        throw new Error(`Producto ${producto.id}: proveedor inexistente "${producto.proveedorId}".`);
      }
      return toProductosActivosPorCatalogoRow(producto, proveedor);
    });

  try {
    const client = await connectCassandra();
    await setupCassandraDatabase(client);
    await new CassandraFarmaRedRepository(client).replaceProductosActivos(rows);
    console.log(`Carga Cassandra completada: ${rows.length} productos activos con proveedor.`);
  } finally {
    await closeCassandra();
  }
}

main().catch((error: unknown) => {
  console.error(`Error al cargar Cassandra: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
