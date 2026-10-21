/**
 * Utilidades de validación y normalización para transacciones P2C de Banco Mercantil.
 */

/**
 * Normaliza un número telefónico venezolano al formato requerido: 584XXXXXXXXX
 * Reemplaza el 0 inicial por 58 y elimina espacios, guiones y caracteres no numéricos.
 *
 * @param {string|number} telefono
 * @returns {string}
 */
export function normalizarTelefono(telefono) {
  if (!telefono) return '584140000000';
  
  // Limpiar todo lo que no sea dígito
  let limpio = telefono.toString().replace(/\D/g, '');

  // Si empieza por 0 (ej: 04141234567 -> 584141234567)
  if (limpio.startsWith('0')) {
    limpio = '58' + limpio.slice(1);
  } else if (!limpio.startsWith('58')) {
    limpio = '58' + limpio;
  }

  return limpio;
}

/**
 * Normaliza y valida el monto numérico en Bolívares.
 *
 * @param {string|number} monto
 * @returns {number}
 */
export function normalizarMonto(monto) {
  if (typeof monto === 'number') return isNaN(monto) ? 0 : Number(monto.toFixed(2));
  if (!monto) return 0;

  // Manejar formato venezolano con coma y punto: ej "1.250,50" -> 1250.50
  const limpio = monto.toString().trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Retorna la fecha en formato YYYY-MM-DD (Venezuela / local).
 *
 * @param {string} [fecha]
 * @returns {string}
 */
export function normalizarFecha(fecha) {
  if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha.trim())) {
    return fecha.trim();
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Limpia y normaliza el número de referencia.
 *
 * @param {string|number} referencia
 * @returns {string}
 */
export function normalizarReferencia(referencia) {
  if (!referencia) return '';
  return referencia.toString().trim().replace(/\s+/g, '');
}
