import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { cifrarMercantil } from '../utils/crypto.util.js';
import { normalizarTelefono, normalizarFecha, normalizarMonto, normalizarReferencia } from '../utils/validator.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.resolve(__dirname, '../../config/config.json');

/**
 * Lee la configuración actual desde config/config.json en caliente.
 *
 * @returns {object}
 */
export function cargarConfiguracion() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[mercantil.service] Error leyendo config/config.json:', err.message);
  }

  return {
    MODO: 'mock',
    PUERTO: 3000,
    CLIENT_ID: 'PEGAR_AQUI_X_IBM_CLIENT_ID',
    MERCHANT_ID: 123456,
    SECRET_KEY: 'PEGAR_AQUI_SECRET_KEY',
    TELEFONO_EMPRESA: '584140000000'
  };
}

/**
 * Retorna configuración segura para el cliente web (sin exponer llaves bancarias).
 *
 * @returns {object}
 */
export function obtenerConfigPublica() {
  const cfg = cargarConfiguracion();
  return {
    modo: (cfg.MODO || 'mock').toLowerCase(),
    puerto: cfg.PUERTO || 3000,
    merchantId: cfg.MERCHANT_ID || 123456,
    telefonoEmpresa: cfg.TELEFONO_EMPRESA || '584140000000'
  };
}

/**
 * Verifica una transacción de Pago Móvil P2C según el modo configurado.
 *
 * @param {object} params
 * @param {string} params.referencia
 * @param {number|string} params.monto
 * @param {string} [params.fechaPago]
 * @param {string} [params.telefonoCliente]
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function verificarPago({ referencia, monto, fechaPago, telefonoCliente }) {
  const refLimpia = normalizarReferencia(referencia);
  const montoNum = normalizarMonto(monto);
  const fechaTrx = normalizarFecha(fechaPago);
  const cfg = cargarConfiguracion();
  const modo = (cfg.MODO || 'mock').toLowerCase();

  if (!refLimpia) {
    return {
      ok: false,
      status: 400,
      data: { estado: 'ERROR', mensaje: 'El número de referencia es requerido' }
    };
  }

  // ==========================================
  // 1. MODO MOCK (Simulación de desarrollo)
  // ==========================================
  if (modo === 'mock') {
    // Si la referencia termina en "0000", simular que no existe en Mercantil (HTTP 404)
    if (refLimpia.endsWith('0000')) {
      return {
        ok: false,
        status: 404,
        data: {
          estado: 'NO_ENCONTRADO',
          mensaje: '❌ Pago móvil no encontrado en Banco Mercantil',
          referencia: refLimpia
        }
      };
    }

    // Para cualquier otra referencia genera la referencia oficial de 12 dígitos ("005891" + referencia)
    let refOficial = '';
    if (refLimpia.length === 12 && refLimpia.startsWith('005891')) {
      refOficial = refLimpia;
    } else {
      const sufijo = refLimpia.slice(-6).padStart(6, '0');
      refOficial = `005891${sufijo}`;
    }

    return {
      ok: true,
      status: 200,
      data: {
        referenciaOficial: refOficial,
        referenciaIngresada: refLimpia,
        monto: montoNum,
        fechaPago: fechaTrx,
        telefonoCliente: telefonoCliente || 'No especificado'
      }
    };
  }

  // ==========================================
  // 2. MODO REAL (Sandbox o Producción Mercantil)
  // ==========================================
  const urlBase = modo === 'prod'
    ? 'https://apimbu.mercantilbanco.com/mercantil-banco/prod/v1/mobile-payment/search'
    : 'https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/mobile-payment/search';

  const telefonoDestino = normalizarTelefono(cfg.TELEFONO_EMPRESA);
  const telefonoDestinoCifrado = cifrarMercantil(telefonoDestino, cfg.SECRET_KEY);

  const payload = {
    merchant_identify: {
      integrator_id: 1,
      merchant_id: cfg.MERCHANT_ID,
      terminal_id: '1'
    },
    client_identify: {
      ipaddress: '127.0.0.1'
    },
    search_by: {
      amount: montoNum,
      currency: 'ves',
      destination_mobile_number: telefonoDestinoCifrado,
      payment_reference: refLimpia,
      trx_date: fechaTrx
    }
  };

  const payloadString = JSON.stringify(payload);
  const urlObj = new URL(urlBase);

  return new Promise((resolve) => {
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'X-IBM-Client-Id': cfg.CLIENT_ID
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const jsonRes = JSON.parse(responseBody);
          if (jsonRes.transaction_list && jsonRes.transaction_list.length > 0) {
            const trx = jsonRes.transaction_list[0];
            const refOficial = trx.payment_reference || refLimpia;
            resolve({
              ok: true,
              status: 200,
              data: {
                referenciaOficial: refOficial,
                referenciaIngresada: refLimpia,
                monto: trx.amount || montoNum,
                fechaPago: fechaTrx,
                telefonoCliente: telefonoCliente || 'Cliente Mercantil'
              }
            });
          } else {
            resolve({
              ok: false,
              status: 404,
              data: {
                estado: 'NO_ENCONTRADO',
                mensaje: '❌ Pago móvil no encontrado en Banco Mercantil',
                referencia: refLimpia
              }
            });
          }
        } catch (e) {
          resolve({
            ok: false,
            status: 502,
            data: { estado: 'ERROR', mensaje: 'Respuesta inválida de Banco Mercantil' }
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 503,
        data: { estado: 'ERROR', mensaje: 'Fallo de conexión con Banco Mercantil: ' + err.message }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        status: 504,
        data: { estado: 'ERROR', mensaje: 'Tiempo de espera agotado con Banco Mercantil' }
      });
    });

    req.write(payloadString);
    req.end();
  });
}
