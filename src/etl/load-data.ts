import { existsSync } from "node:fs";
import { join } from "node:path";
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

const providedDataDirectory = fileURLToPath(new URL("../../data/provided/", import.meta.url));
const extraDataDirectory = fileURLToPath(new URL("../../data/extra/", import.meta.url));

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

function emptyData(): FarmaRedData {
  return {
    clientes: [],
    proveedores: [],
    productos: [],
    sucursales: [],
    farmaceuticos: [],
    recetas: [],
    lotesStock: [],
    ventas: [],
    detallesVenta: [],
  };
}

async function loadDirectory(dataDirectory: string, optional: boolean): Promise<FarmaRedData> {
  const shouldLoad = (fileName: string): boolean => !optional || existsSync(join(dataDirectory, fileName));

  const [clientes, proveedores, productos, sucursales, farmaceuticos, recetas, lotesStock, ventas, detallesVenta] =
    await Promise.all([
      shouldLoad("clientes.csv") ? loadClientes(dataDirectory) : Promise.resolve([]),
      shouldLoad("proveedores.csv") ? loadProveedores(dataDirectory) : Promise.resolve([]),
      shouldLoad("productos.csv") ? loadProductos(dataDirectory) : Promise.resolve([]),
      shouldLoad("sucursales.csv") ? loadSucursales(dataDirectory) : Promise.resolve([]),
      shouldLoad("farmaceuticos.csv") ? loadFarmaceuticos(dataDirectory) : Promise.resolve([]),
      shouldLoad("recetas.csv") ? loadRecetas(dataDirectory) : Promise.resolve([]),
      shouldLoad("stock_lotes.csv") ? loadLotesStock(dataDirectory) : Promise.resolve([]),
      shouldLoad("ventas.csv") ? loadVentas(dataDirectory) : Promise.resolve([]),
      shouldLoad("detalle_ventas.csv") ? loadDetallesVenta(dataDirectory) : Promise.resolve([]),
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

function mergeData(parts: FarmaRedData[]): FarmaRedData {
  return parts.reduce<FarmaRedData>(
    (merged, part) => ({
      clientes: [...merged.clientes, ...part.clientes],
      proveedores: [...merged.proveedores, ...part.proveedores],
      productos: [...merged.productos, ...part.productos],
      sucursales: [...merged.sucursales, ...part.sucursales],
      farmaceuticos: [...merged.farmaceuticos, ...part.farmaceuticos],
      recetas: [...merged.recetas, ...part.recetas],
      lotesStock: [...merged.lotesStock, ...part.lotesStock],
      ventas: [...merged.ventas, ...part.ventas],
      detallesVenta: [...merged.detallesVenta, ...part.detallesVenta],
    }),
    emptyData(),
  );
}

export async function loadFarmaRedData(
  dataDirectories: string[] = [providedDataDirectory, extraDataDirectory],
): Promise<FarmaRedData> {
  const parts: FarmaRedData[] = [];

  for (const [index, dataDirectory] of dataDirectories.entries()) {
    parts.push(await loadDirectory(dataDirectory, index > 0));
  }

  return mergeData(parts);
}
