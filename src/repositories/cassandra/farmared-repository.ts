import type { Client } from "cassandra-driver";
import { cassandraKeyspace } from "../../db/cassandra/setup.js";
import { productosActivosPorCatalogoTable } from "../../db/cassandra/tables/productos-activos-por-catalogo.js";
import {
  catalogoFarmaRed,
  type ProductosActivosPorCatalogoRow,
} from "../../schemas/cassandra/productos-activos-por-catalogo.js";

const table = `${cassandraKeyspace}.${productosActivosPorCatalogoTable}`;
const columns: Record<keyof ProductosActivosPorCatalogoRow, string> = {
  catalogo: "catalogo",
  productoId: "producto_id",
  productoNombre: "producto_nombre",
  principioActivo: "principio_activo",
  categoria: "categoria",
  presentacion: "presentacion",
  condicionVenta: "condicion_venta",
  precioUnitario: "precio_unitario",
  proveedorId: "proveedor_id",
  proveedorRazonSocial: "proveedor_razon_social",
  proveedorCuit: "proveedor_cuit",
  proveedorTipo: "proveedor_tipo",
  proveedorCiudad: "proveedor_ciudad",
  proveedorProvincia: "proveedor_provincia",
  proveedorTelefono: "proveedor_telefono",
  proveedorActivo: "proveedor_activo",
};

export class CassandraFarmaRedRepository {
  constructor(private readonly client: Client) {}

  /** Refreshes the small CSV-backed q01 view, removing stale active-product rows. */
  async replaceProductosActivos(rows: ProductosActivosPorCatalogoRow[]): Promise<void> {
    const entries = Object.entries(columns);
    const insert = `INSERT INTO ${table} (${entries.map(([, column]) => column).join(", ")})
      VALUES (${entries.map(() => "?").join(", ")})`;

    await this.client.execute(`DELETE FROM ${table} WHERE catalogo = ?`, [catalogoFarmaRed], { prepare: true });
    for (const row of rows) {
      const params = entries.map(([key]) => row[key as keyof ProductosActivosPorCatalogoRow]);
      await this.client.execute(insert, params, { prepare: true });
    }
  }

  async getProductosActivos(): Promise<ProductosActivosPorCatalogoRow[]> {
    const rows: ProductosActivosPorCatalogoRow[] = [];
    let pageState: string | undefined;

    do {
      const result = await this.client.execute(`SELECT * FROM ${table} WHERE catalogo = ?`, [catalogoFarmaRed], {
        prepare: true,
        pageState,
      });
      for (const row of result.rows) {
        const values = Object.fromEntries(Object.entries(columns).map(([key, column]) => [key, row.get(column)]));
        // Cassandra decimal values are driver objects, while domain prices are numbers.
        values.precioUnitario = Number(String(values.precioUnitario));
        rows.push(values as ProductosActivosPorCatalogoRow);
      }
      pageState = result.pageState;
    } while (pageState);

    return rows;
  }
}
