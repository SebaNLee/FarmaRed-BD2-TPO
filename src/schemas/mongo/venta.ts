import type { DetalleVenta } from "../../models/detalle-venta.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";
import type { MongoDocument } from "./common.js";

export type DetalleVentaMongoEmbedded = Omit<DetalleVenta, "id" | "ventaId"> & {
  _id: string;
};

export type VentaMongoDocument = Omit<MongoDocument<VentaConDetalles>, "detalles"> & {
  detalles: DetalleVentaMongoEmbedded[];
};
