import type { Cliente } from "../../models/cliente.js";
import { readCsv } from "../csv.js";
import { parseCliente, type ClienteCsvRow } from "../parsers/cliente.js";

export async function loadClientes(dataDirectory: string): Promise<Cliente[]> {
  const rows = await readCsv<ClienteCsvRow>(`${dataDirectory}/clientes.csv`);
  return rows.map(parseCliente);
}
