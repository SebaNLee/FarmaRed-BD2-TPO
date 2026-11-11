import type { Db } from "mongodb";
import type { ClienteMongoDocument } from "../../schemas/mongo/cliente.js";
import type { FarmaceuticoMongoDocument } from "../../schemas/mongo/farmaceutico.js";
import type { LoteStockMongoDocument } from "../../schemas/mongo/lote-stock.js";
import type { ProductoMongoDocument } from "../../schemas/mongo/producto.js";
import type { ProveedorMongoDocument } from "../../schemas/mongo/proveedor.js";
import type { RecetaMongoDocument } from "../../schemas/mongo/receta.js";
import type { SucursalMongoDocument } from "../../schemas/mongo/sucursal.js";
import type { VentaMongoDocument } from "../../schemas/mongo/venta.js";

export const mongoCollectionNames = [
  "clientes",
  "proveedores",
  "productos",
  "sucursales",
  "farmaceuticos",
  "recetas",
  "stock_lotes",
  "ventas",
] as const;

export type MongoCollectionName = (typeof mongoCollectionNames)[number];

async function ensureCollection(db: Db, name: MongoCollectionName): Promise<void> {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();

  if (!exists) {
    await db.createCollection(name);
  }
}

export async function setupMongoDatabase(db: Db): Promise<void> {
  for (const collectionName of mongoCollectionNames) {
    await ensureCollection(db, collectionName);
  }

  const clientes = db.collection<ClienteMongoDocument>("clientes");
  const proveedores = db.collection<ProveedorMongoDocument>("proveedores");
  const productos = db.collection<ProductoMongoDocument>("productos");
  const sucursales = db.collection<SucursalMongoDocument>("sucursales");
  const farmaceuticos = db.collection<FarmaceuticoMongoDocument>("farmaceuticos");
  const recetas = db.collection<RecetaMongoDocument>("recetas");
  const lotesStock = db.collection<LoteStockMongoDocument>("stock_lotes");
  const ventas = db.collection<VentaMongoDocument>("ventas");

  await Promise.all([
    clientes.createIndex({ dni: 1 }, { unique: true, name: "unique_dni" }),
    clientes.createIndex({ activo: 1, ciudad: 1 }, { name: "active_by_city" }),
    proveedores.createIndex({ activo: 1 }, { name: "active_providers" }),
    productos.createIndex({ activo: 1, proveedorId: 1 }, { name: "active_by_provider" }),
    sucursales.createIndex({ tipo: 1, activo: 1 }, { name: "by_type_and_status" }),
    farmaceuticos.createIndex({ sucursalId: 1, activo: 1 }, { name: "by_branch_and_status" }),
    recetas.createIndex({ clienteId: 1, fechaEmision: -1 }, { name: "by_customer_and_date" }),
    recetas.createIndex({ tipo: 1, estado: 1, proximaDispensa: 1 }, { name: "long_treatment_due" }),
    lotesStock.createIndex({ productoId: 1, sucursalId: 1, vencimiento: 1 }, { name: "fefo_by_product_and_branch" }),
    lotesStock.createIndex({ unidades: 1 }, { name: "low_stock" }),
    ventas.createIndex({ clienteId: 1, fecha: -1 }, { name: "by_customer_and_date" }),
    ventas.createIndex({ farmaceuticoId: 1, fecha: -1 }, { name: "by_pharmacist_and_date" }),
    ventas.createIndex({ estado: 1, fecha: -1 }, { name: "by_status_and_date" }),
    ventas.createIndex({ tipo: 1, estado: 1, total: 1 }, { name: "free_sales_by_total" }),
    ventas.createIndex({ "detalles.productoId": 1, estado: 1 }, { name: "completed_sales_by_product" }),
  ]);
}
