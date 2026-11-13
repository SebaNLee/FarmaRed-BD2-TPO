import type { AnyBulkWriteOperation, Collection, Db, Document, Filter, WithoutId } from "mongodb";
import type { FarmaRedData } from "../../etl/load-data.js";
import type { DetalleVenta } from "../../models/detalle-venta.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";
import { mongoCollectionNames, type MongoCollectionName } from "../../db/mongo/setup.js";
import type { ClienteMongoDocument } from "../../schemas/mongo/cliente.js";
import type { MongoDocument } from "../../schemas/mongo/common.js";
import type { FarmaceuticoMongoDocument } from "../../schemas/mongo/farmaceutico.js";
import type { ProductoMongoDocument } from "../../schemas/mongo/producto.js";
import type { ProveedorMongoDocument } from "../../schemas/mongo/proveedor.js";
import type { RecetaMongoDocument } from "../../schemas/mongo/receta.js";
import type { SucursalMongoDocument } from "../../schemas/mongo/sucursal.js";
import type { DetalleVentaMongoEmbedded, VentaMongoDocument } from "../../schemas/mongo/venta.js";

function toMongoDocument<T extends { id: string }>(entity: T): MongoDocument<T> {
  const { id, ...document } = entity;
  return { _id: id, ...document } as MongoDocument<T>;
}

function toDetalleVentaMongoDocument({
  id,
  productoId,
  cantidad,
  precioUnitario,
}: DetalleVenta): DetalleVentaMongoEmbedded {
  return { _id: id, productoId, cantidad, precioUnitario };
}

function toVentaMongoDocument(venta: VentaConDetalles): VentaMongoDocument {
  const { id, detalles, ...cabecera } = venta;

  return {
    _id: id,
    ...cabecera,
    detalles: detalles.map(toDetalleVentaMongoDocument),
  };
}

export class MongoFarmaRedRepository {
  private readonly clientes: Collection<ClienteMongoDocument>;
  private readonly proveedores: Collection<ProveedorMongoDocument>;
  private readonly productos: Collection<ProductoMongoDocument>;
  private readonly sucursales: Collection<SucursalMongoDocument>;
  private readonly farmaceuticos: Collection<FarmaceuticoMongoDocument>;
  private readonly recetas: Collection<RecetaMongoDocument>;
  private readonly ventas: Collection<VentaMongoDocument>;

  constructor(private readonly db: Db) {
    this.clientes = db.collection<ClienteMongoDocument>("clientes");
    this.proveedores = db.collection<ProveedorMongoDocument>("proveedores");
    this.productos = db.collection<ProductoMongoDocument>("productos");
    this.sucursales = db.collection<SucursalMongoDocument>("sucursales");
    this.farmaceuticos = db.collection<FarmaceuticoMongoDocument>("farmaceuticos");
    this.recetas = db.collection<RecetaMongoDocument>("recetas");
    this.ventas = db.collection<VentaMongoDocument>("ventas");
  }

  async upsertData(data: FarmaRedData, ventasConDetalles: VentaConDetalles[]): Promise<void> {
    await this.replaceMany(this.proveedores, data.proveedores.map(toMongoDocument));
    await this.replaceMany(this.productos, data.productos.map(toMongoDocument));
    await this.replaceMany(this.sucursales, data.sucursales.map(toMongoDocument));
    await this.replaceMany(this.farmaceuticos, data.farmaceuticos.map(toMongoDocument));
    await this.replaceMany(this.clientes, data.clientes.map(toMongoDocument));
    await this.replaceMany(this.recetas, data.recetas.map(toMongoDocument));
    await this.replaceMany(this.ventas, ventasConDetalles.map(toVentaMongoDocument));
  }

  async getDocumentCounts(): Promise<Record<MongoCollectionName, number>> {
    const counts = await Promise.all(
      mongoCollectionNames.map(async (name): Promise<[MongoCollectionName, number]> => [
        name,
        await this.db.collection(name).countDocuments(),
      ]),
    );

    return Object.fromEntries(counts) as Record<MongoCollectionName, number>;
  }

  private async replaceMany<T extends Document & { _id: string }>(
    collection: Collection<T>,
    documents: T[],
  ): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const operations = documents.map((document): AnyBulkWriteOperation<T> => {
      const { _id, ...replacement } = document;

      return {
        replaceOne: {
          filter: { _id } as Filter<T>,
          replacement: replacement as WithoutId<T>,
          upsert: true,
        },
      };
    });

    await collection.bulkWrite(operations, { ordered: true });
  }
}
