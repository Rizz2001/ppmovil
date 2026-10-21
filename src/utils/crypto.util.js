import crypto from 'node:crypto';

/**
 * Cifrado simétrico propietario de Banco Mercantil P2C / C2P:
 * 1. Deriva la clave simétrica calculando SHA-256 binario de la SECRET_KEY.
 * 2. Recorta estrictamente los primeros 16 bytes (128 bits).
 * 3. Cifra con AES-128-ECB (sin IV), padding PKCS#7 y salida Base64.
 *
 * @param {string} textoPlano Texto o JSON a cifrar
 * @param {string} secretKey Clave secreta bancaria
 * @returns {string} Cadena cifrada en Base64
 */
export function cifrarMercantil(textoPlano, secretKey) {
  if (!textoPlano || !secretKey) {
    throw new Error('Texto plano y secretKey son requeridos para cifrar.');
  }

  // Hash SHA-256 en binario (32 bytes)
  const hashCompleto = crypto.createHash('sha256').update(secretKey, 'utf8').digest();

  // Cortar estrictamente los primeros 16 bytes
  const key16Bytes = hashCompleto.subarray(0, 16);

  // Cifrado AES-128-ECB sin vector de inicialización (IV = null)
  const cipher = crypto.createCipheriv('aes-128-ecb', key16Bytes, null);
  cipher.setAutoPadding(true);

  let cifradoBase64 = cipher.update(textoPlano, 'utf8', 'base64');
  cifradoBase64 += cipher.final('base64');

  return cifradoBase64;
}

/**
 * Descifra un payload Base64 cifrado con AES-128-ECB de Mercantil.
 *
 * @param {string} textoCifradoBase64
 * @param {string} secretKey
 * @returns {string} Texto plano original
 */
export function descifrarMercantil(textoCifradoBase64, secretKey) {
  if (!textoCifradoBase64 || !secretKey) {
    throw new Error('Texto cifrado y secretKey son requeridos para descifrar.');
  }

  const hashCompleto = crypto.createHash('sha256').update(secretKey, 'utf8').digest();
  const key16Bytes = hashCompleto.subarray(0, 16);

  const decipher = crypto.createDecipheriv('aes-128-ecb', key16Bytes, null);
  decipher.setAutoPadding(true);

  let descifrado = decipher.update(textoCifradoBase64, 'base64', 'utf8');
  descifrado += decipher.final('utf8');

  return descifrado;
}
