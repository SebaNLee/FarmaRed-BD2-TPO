import { loadFarmaRedData } from "../etl/load-data.js";
import { assembleVentasConDetalles } from "../etl/assemblers/assemble-ventas-con-detalles.js";
import { validateData } from "../etl/validators/index.js";

/* Temporary script to validate the ETL. Run it with:
 ** pnpm install
 ** pnpm etl:validate
 */

async function main(): Promise<void> {
  const data = await loadFarmaRedData();
  validateData(data);
  const ventasConDetalles = assembleVentasConDetalles(data.ventas, data.detallesVenta);

  console.log("ETL valid: parsing and integrity checks passed.");
  console.log(`Clients: ${data.clientes.length}`);
  console.log(`Providers: ${data.proveedores.length}`);
  console.log(`Products: ${data.productos.length}`);
  console.log(`Branches: ${data.sucursales.length}`);
  console.log(`Pharmacists: ${data.farmaceuticos.length}`);
  console.log(`Prescriptions: ${data.recetas.length}`);
  console.log(`Stock lots: ${data.lotesStock.length}`);
  console.log(`Sales: ${data.ventas.length}`);
  console.log(`Sale details: ${data.detallesVenta.length}`);
  console.log(`Sales with details: ${ventasConDetalles.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error validating ETL: ${message}`);
  process.exitCode = 1;
});
