import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/pagos_verificados.json');

/**
 * Asegura que el archivo data/pagos_verificados.json exista.
 */
function asegurarArchivo() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

/**
 * Lee la lista completa de pagos verificados desde el archivo local.
 *
 * @returns {Array<object>}
 */
export function obtenerPagos() {
  asegurarArchivo();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[storage.service] Error al leer pagos_verificados.json:', err.message);
    return [];
  }
}

/**
 * Busca si un pago con la referencia oficial o ingresada ya fue registrado.
 *
 * @param {string} refOficial
 * @param {string} [refIngresada]
 * @returns {object|null}
 */
export function buscarDuplicado(refOficial, refIngresada = '') {
  const pagos = obtenerPagos();
  return pagos.find(p => 
    p.referenciaOficial === refOficial || 
    (refIngresada && p.referenciaIngresada === refIngresada)
  ) || null;
}

/**
 * Guarda un nuevo pago verificado en la base de datos local (al inicio del array).
 *
 * @param {object} nuevoPago
 * @returns {boolean}
 */
export function guardarPago(nuevoPago) {
  asegurarArchivo();
  try {
    const pagos = obtenerPagos();
    pagos.unshift(nuevoPago);
    fs.writeFileSync(DATA_FILE, JSON.stringify(pagos, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[storage.service] Error al guardar nuevo pago:', err.message);
    return false;
  }
}
