import { loadFarmaRedData } from "../etl/load-data.js";
import { assembleVentasConDetalles } from "../etl/assemblers/assemble-ventas-con-detalles.js";
import { validateData } from "../etl/validators/index.js";

/* Uso temporal para validar el ETL. Se puede ejecutar con el comando:
 ** pnpm install
 ** pnpm etl:validate
 */

async function main(): Promise<void> {
  const data = await loadFarmaRedData();
  validateData(data);
  const ventasConDetalles = assembleVentasConDetalles(data.ventas, data.detallesVenta);

  console.log("ETL válido: parseo e integridad verificados.");
  console.log(`Clientes: ${data.clientes.length}`);
  console.log(`Proveedores: ${data.proveedores.length}`);
  console.log(`Productos: ${data.productos.length}`);
  console.log(`Sucursales: ${data.sucursales.length}`);
  console.log(`Farmacéuticos: ${data.farmaceuticos.length}`);
  console.log(`Recetas: ${data.recetas.length}`);
  console.log(`Lotes de stock: ${data.lotesStock.length}`);
  console.log(`Ventas: ${data.ventas.length}`);
  console.log(`Detalles de venta: ${data.detallesVenta.length}`);
  console.log(`Ventas con detalles: ${ventasConDetalles.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error al validar el ETL: ${message}`);
  process.exitCode = 1;
});
