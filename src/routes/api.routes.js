import crypto from 'node:crypto';
import { verificarPago, obtenerConfigPublica } from '../services/mercantil.service.js';
import { obtenerPagos, buscarDuplicado, guardarPago } from '../services/storage.service.js';

/**
 * Envia una respuesta JSON estandarizada con encabezados CORS.
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

/**
 * Lee el cuerpo JSON de una petición entrante.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Manejador principal para rutas /api/*
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 */
export async function handleApiRoutes(req, res, url) {
  const pathname = url.pathname;

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // 1. GET /api/config
  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, obtenerConfigPublica());
  }

  // 2. GET /api/historial
  if (req.method === 'GET' && pathname === '/api/historial') {
    const pagos = obtenerPagos();
    return sendJson(res, 200, pagos);
  }

  // 3. POST /api/verificar
  if (req.method === 'POST' && pathname === '/api/verificar') {
    try {
      const data = await parseBody(req);
      const { referencia, monto, fechaPago, telefonoCliente } = data;

      // 1. Consulta al servicio Mercantil (o simulación Mock)
      const resultadoMercantil = await verificarPago({
        referencia,
        monto,
        fechaPago,
        telefonoCliente
      });

      // Si no fue exitoso en Mercantil (ej: 404 No Encontrado o error)
      if (!resultadoMercantil.ok) {
        return sendJson(res, resultadoMercantil.status, resultadoMercantil.data);
      }

      const infoTrx = resultadoMercantil.data;

      // 2. Control Local Anti-Fraude (validar contra data/pagos_verificados.json)
      const duplicado = buscarDuplicado(infoTrx.referenciaOficial, infoTrx.referenciaIngresada);
      if (duplicado) {
        return sendJson(res, 409, {
          estado: 'DUPLICADO',
          mensaje: '⚠️ PAGO YA UTILIZADO ANTERIORMENTE',
          referencia: infoTrx.referenciaOficial,
          monto: duplicado.monto,
          fechaHoraUsoOriginal: duplicado.fechaHoraRegistro,
          pagoExistente: duplicado
        });
      }

      // 3. Registro del nuevo pago aprobado
      const ahora = new Date();
      const fechaHoraRegistro = ahora.toLocaleString('es-VE', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
      });

      const nuevoPago = {
        id: crypto.randomUUID ? crypto.randomUUID() : `pago_${Date.now()}`,
        referenciaOficial: infoTrx.referenciaOficial,
        referenciaIngresada: infoTrx.referenciaIngresada,
        monto: infoTrx.monto,
        fechaPago: infoTrx.fechaPago,
        telefonoCliente: infoTrx.telefonoCliente || 'No especificado',
        fechaHoraRegistro,
        timestamp: ahora.getTime()
      };

      guardarPago(nuevoPago);

      return sendJson(res, 200, {
        estado: 'APROBADO',
        mensaje: 'Pago móvil aprobado',
        referencia: infoTrx.referenciaOficial,
        referenciaIngresada: infoTrx.referenciaIngresada,
        monto: infoTrx.monto,
        fechaPago: infoTrx.fechaPago,
        fechaHora: fechaHoraRegistro,
        pago: nuevoPago
      });

    } catch (err) {
      console.error('[api.routes] Error en /api/verificar:', err);
      return sendJson(res, 500, {
        estado: 'ERROR',
        mensaje: 'Error interno en el servidor: ' + err.message
      });
    }
  }

  // Ruta API no reconocida
  return sendJson(res, 404, { estado: 'ERROR', mensaje: 'Endpoint no encontrado' });
}
