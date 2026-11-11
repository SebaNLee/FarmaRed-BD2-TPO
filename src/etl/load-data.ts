import { fileURLToPath } from "node:url";
import type { Cliente } from "../models/cliente.js";
import type { DetalleVenta } from "../models/detalle-venta.js";
import type { Farmaceutico } from "../models/farmaceutico.js";
import type { LoteStock } from "../models/lote.stock.js";
import type { Producto } from "../models/producto.js";
import type { Proveedor } from "../models/proveedor.js";
import type { Receta } from "../models/receta.js";
import type { Sucursal } from "../models/sucursal.js";
import type { Venta } from "../models/venta.js";
import { loadClientes } from "./loaders/load-clientes.js";
import { loadDetallesVenta } from "./loaders/load-detalles-venta.js";
import { loadFarmaceuticos } from "./loaders/load-farmaceuticos.js";
import { loadLotesStock } from "./loaders/load-lotes-stock.js";
import { loadProductos } from "./loaders/load-productos.js";
import { loadProveedores } from "./loaders/load-proveedores.js";
import { loadRecetas } from "./loaders/load-recetas.js";
import { loadSucursales } from "./loaders/load-sucursales.js";
import { loadVentas } from "./loaders/load-ventas.js";

const defaultDataDirectory = fileURLToPath(new URL("../../data/provided/", import.meta.url));

export type FarmaRedData = {
  clientes: Cliente[];
  proveedores: Proveedor[];
  productos: Producto[];
  sucursales: Sucursal[];
  farmaceuticos: Farmaceutico[];
  recetas: Receta[];
  lotesStock: LoteStock[];
  ventas: Venta[];
  detallesVenta: DetalleVenta[];
};

/**
 * Reads every source CSV and transforms each raw row into a domain model.
 * No relational validation or database writes are performed here.
 */
export async function loadFarmaRedData(dataDirectory = defaultDataDirectory): Promise<FarmaRedData> {
  const [clientes, proveedores, productos, sucursales, farmaceuticos, recetas, lotesStock, ventas, detallesVenta] =
    await Promise.all([
      loadClientes(dataDirectory),
      loadProveedores(dataDirectory),
      loadProductos(dataDirectory),
      loadSucursales(dataDirectory),
      loadFarmaceuticos(dataDirectory),
      loadRecetas(dataDirectory),
      loadLotesStock(dataDirectory),
      loadVentas(dataDirectory),
      loadDetallesVenta(dataDirectory),
    ]);

  return {
    clientes,
    proveedores,
    productos,
    sucursales,
    farmaceuticos,
    recetas,
    lotesStock,
    ventas,
    detallesVenta,
  };
}
