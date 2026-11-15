import type { ClientSession, Collection, Db, MongoClient } from "mongodb";
import type { ClienteMongoDocument } from "../../schemas/mongo/cliente.js";
import type { FarmaceuticoMongoDocument } from "../../schemas/mongo/farmaceutico.js";
import type { ProductoMongoDocument } from "../../schemas/mongo/producto.js";
import type { RecetaMongoDocument } from "../../schemas/mongo/receta.js";
import type { SucursalMongoDocument } from "../../schemas/mongo/sucursal.js";
import type { VentaMongoDocument } from "../../schemas/mongo/venta.js";
import type { BloqueoOperacion, EstadoOperacionVenta, OperacionVenta } from "../../models/operacion-venta.js";
import type { Receta } from "../../models/receta.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";
import type { VentaPreparada } from "../../queries/util/types.js";

type OperacionVentaMongoDocument = Omit<OperacionVenta, "id"> & {
  _id: string;
};

const BLOQUEO_MS = 60_000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function fromRecetaDocument(document: RecetaMongoDocument): Receta {
  const { _id, ...rest } = document;
  return { id: _id, ...rest };
}

function fromVentaDocument(document: VentaMongoDocument): VentaConDetalles {
  const { _id, detalles, ...rest } = document;

  return {
    id: _id,
    ...rest,
    detalles: detalles.map((detalle) => ({
      id: detalle._id,
      ventaId: _id,
      productoId: detalle.productoId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
    })),
  };
}

function toVentaDocument(venta: VentaConDetalles): VentaMongoDocument {
  const { id, detalles, ...rest } = venta;

  return {
    _id: id,
    ...rest,
    detalles: detalles.map((detalle) => ({
      _id: detalle.id,
      productoId: detalle.productoId,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
    })),
  };
}

function fromOperacionDocument(document: OperacionVentaMongoDocument): OperacionVenta {
  const { _id, ...rest } = document;
  return {
    ...rest,
    id: _id,
  };
}

export type CrearOperacionInput = {
  id: string;
};

export class OperacionVentaRepository {
  private readonly clientes: Collection<ClienteMongoDocument>;
  private readonly farmaceuticos: Collection<FarmaceuticoMongoDocument>;
  private readonly sucursales: Collection<SucursalMongoDocument>;
  private readonly productos: Collection<ProductoMongoDocument>;
  private readonly recetas: Collection<RecetaMongoDocument>;
  private readonly ventas: Collection<VentaMongoDocument>;
  private readonly operaciones: Collection<OperacionVentaMongoDocument>;

  constructor(
    private readonly client: MongoClient,
    db: Db,
  ) {
    this.clientes = db.collection<ClienteMongoDocument>("clientes");
    this.farmaceuticos = db.collection<FarmaceuticoMongoDocument>("farmaceuticos");
    this.sucursales = db.collection<SucursalMongoDocument>("sucursales");
    this.productos = db.collection<ProductoMongoDocument>("productos");
    this.recetas = db.collection<RecetaMongoDocument>("recetas");
    this.ventas = db.collection<VentaMongoDocument>("ventas");
    this.operaciones = db.collection<OperacionVentaMongoDocument>("operaciones_venta");
  }

  async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = this.client.startSession();

    try {
      return await session.withTransaction(async () => fn(session), {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });
    } finally {
      await session.endSession();
    }
  }

  findCliente(id: string): Promise<ClienteMongoDocument | null> {
    return this.clientes.findOne({ _id: id });
  }

  findFarmaceutico(id: string): Promise<FarmaceuticoMongoDocument | null> {
    return this.farmaceuticos.findOne({ _id: id });
  }

  findSucursal(id: string): Promise<SucursalMongoDocument | null> {
    return this.sucursales.findOne({ _id: id });
  }

  findProductos(ids: string[]): Promise<ProductoMongoDocument[]> {
    return this.productos.find({ _id: { $in: ids } }).toArray();
  }

  async findReceta(id: string): Promise<Receta | null> {
    const document = await this.recetas.findOne({ _id: id });
    return document === null ? null : fromRecetaDocument(document);
  }

  async findVenta(id: string): Promise<VentaConDetalles | null> {
    const document = await this.ventas.findOne({ _id: id });
    return document === null ? null : fromVentaDocument(document);
  }

  async findOperacion(id: string): Promise<OperacionVenta | null> {
    const document = await this.operaciones.findOne({ _id: id });
    return document === null ? null : fromOperacionDocument(document);
  }

  async crearOperacion(input: CrearOperacionInput): Promise<OperacionVenta> {
    const now = new Date();
    const document: OperacionVentaMongoDocument = {
      _id: input.id,
      estado: "PENDIENTE",
      bloqueo: null,
      versionBloqueo: 0,
      error: null,
      creadoEn: now,
      actualizadoEn: now,
    };

    try {
      await this.operaciones.insertOne(document);
      return fromOperacionDocument(document);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const existing = await this.findOperacion(input.id);

      if (existing === null) {
        throw error;
      }

      return existing;
    }
  }

  async adquirirBloqueo(id: string, propietario: string): Promise<BloqueoOperacion | null> {
    const now = new Date();
    const document = await this.operaciones.findOneAndUpdate(
      {
        _id: id,
        estado: "PENDIENTE",
        $or: [{ bloqueo: null }, { "bloqueo.expiraEn": { $lt: now } }],
      },
      {
        $set: {
          bloqueo: { propietario, expiraEn: new Date(now.getTime() + BLOQUEO_MS) },
          actualizadoEn: now,
        },
        $inc: { versionBloqueo: 1 },
      },
      { returnDocument: "after" },
    );

    if (document === null || document.bloqueo === null) {
      return null;
    }

    return {
      propietario: document.bloqueo.propietario,
      version: document.versionBloqueo,
      expiraEn: document.bloqueo.expiraEn,
    };
  }

  async renovarBloqueo(id: string, bloqueo: BloqueoOperacion): Promise<boolean> {
    const result = await this.operaciones.updateOne(
      {
        _id: id,
        "bloqueo.propietario": bloqueo.propietario,
        versionBloqueo: bloqueo.version,
      },
      {
        $set: {
          "bloqueo.expiraEn": new Date(Date.now() + BLOQUEO_MS),
          actualizadoEn: new Date(),
        },
      },
    );

    return result.modifiedCount === 1;
  }

  async liberarBloqueo(id: string, bloqueo: BloqueoOperacion): Promise<void> {
    await this.operaciones.updateOne(
      {
        _id: id,
        "bloqueo.propietario": bloqueo.propietario,
        versionBloqueo: bloqueo.version,
      },
      { $set: { bloqueo: null, actualizadoEn: new Date() } },
    );
  }

  async marcarConfirmada(id: string, bloqueo: BloqueoOperacion): Promise<boolean> {
    const result = await this.operaciones.updateOne(
      {
        _id: id,
        estado: "PENDIENTE",
        "bloqueo.propietario": bloqueo.propietario,
        versionBloqueo: bloqueo.version,
      },
      {
        $set: {
          estado: "CONFIRMADA",
          error: null,
          bloqueo: null,
          actualizadoEn: new Date(),
        },
      },
    );

    return result.modifiedCount === 1;
  }

  async marcarAbortada(id: string, detalle: string): Promise<void> {
    await this.operaciones.updateOne(
      { _id: id },
      {
        $set: {
          estado: "ABORTADA",
          error: detalle,
          bloqueo: null,
          actualizadoEn: new Date(),
        },
      },
    );
  }

  async registrarError(id: string, detalle: string): Promise<void> {
    await this.operaciones.updateOne(
      { _id: id },
      {
        $set: {
          error: detalle,
          bloqueo: null,
          actualizadoEn: new Date(),
        },
      },
    );
  }

  async commitFinal(preparada: VentaPreparada, operacionId: string, bloqueo: BloqueoOperacion): Promise<void> {
    await this.withTransaction(async (session) => {
      await this.ventas.updateOne(
        { _id: preparada.ventaId },
        { $setOnInsert: toVentaDocument(preparada.venta) },
        { upsert: true, session },
      );

      if (preparada.recetaAntes !== null && preparada.recetaDespues !== null) {
        const recetaResult = await this.recetas.findOneAndUpdate(
          {
            _id: preparada.recetaAntes.id,
            estado: "Vigente",
            dispensasRealizadas: preparada.recetaAntes.dispensasRealizadas,
          },
          {
            $set: {
              dispensasRealizadas: preparada.recetaDespues.dispensasRealizadas,
              estado: preparada.recetaDespues.estado,
              proximaDispensa: preparada.recetaDespues.proximaDispensa,
            },
          },
          { session },
        );

        if (recetaResult === null) {
          throw new Error("CONFLICTO_RECETA");
        }
      }

      const operacionResult = await this.operaciones.updateOne(
        {
          _id: operacionId,
          estado: "PENDIENTE",
          "bloqueo.propietario": bloqueo.propietario,
          versionBloqueo: bloqueo.version,
        },
        {
          $set: {
            estado: "CONFIRMADA",
            error: null,
            bloqueo: null,
            actualizadoEn: new Date(),
          },
        },
        { session },
      );

      if (operacionResult.modifiedCount !== 1) {
        throw new Error("BLOQUEO_PERDIDO");
      }
    });
  }

  async findOperacionesParaReconciliar(olderThan: Date, limit = 100): Promise<OperacionVenta[]> {
    const now = new Date();
    const documents = await this.operaciones
      .find({
        estado: "PENDIENTE",
        actualizadoEn: { $lt: olderThan },
        $or: [{ bloqueo: null }, { "bloqueo.expiraEn": { $lt: now } }],
      })
      .limit(limit)
      .toArray();

    return documents.map(fromOperacionDocument);
  }
}

export type { EstadoOperacionVenta };
