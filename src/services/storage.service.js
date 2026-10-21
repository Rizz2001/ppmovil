import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/pagos_verificados.json');
const SESIONES_FILE = path.resolve(__dirname, '../../data/caja_sesiones.json');

/**
 * Asegura que los archivos de datos existan.
 */
function asegurarArchivos() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
  if (!fs.existsSync(SESIONES_FILE)) {
    fs.writeFileSync(SESIONES_FILE, JSON.stringify({ sesionActiva: null, historialSesiones: [] }, null, 2), 'utf-8');
  }
}

/**
 * Lee la estructura completa de sesiones de caja.
 *
 * @returns {{ sesionActiva: object|null, historialSesiones: Array<object> }}
 */
function leerSesiones() {
  asegurarArchivos();
  try {
    const raw = fs.readFileSync(SESIONES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[storage.service] Error al leer caja_sesiones.json:', err.message);
    return { sesionActiva: null, historialSesiones: [] };
  }
}

/**
 * Guarda la estructura de sesiones de caja.
 */
function guardarSesiones(data) {
  asegurarArchivos();
  try {
    fs.writeFileSync(SESIONES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[storage.service] Error al guardar caja_sesiones.json:', err.message);
    return false;
  }
}

/**
 * Obtiene la sesión de caja actualmente activa (o null).
 *
 * @returns {object|null}
 */
export function obtenerSesionActiva() {
  const data = leerSesiones();
  return data.sesionActiva || null;
}

/**
 * Obtiene el estado actual de la caja, métricas de la sesión y pagos asociados.
 *
 * @returns {object}
 */
export function obtenerEstadoCaja() {
  const { sesionActiva } = leerSesiones();
  const todosLosPagos = obtenerPagos();

  if (!sesionActiva) {
    return {
      abierta: false,
      sesion: null,
      totalBs: 0,
      cantidadPagos: 0,
      pagos: []
    };
  }

  // Filtrar pagos que pertenezcan a esta sesión específica
  const pagosSesion = todosLosPagos.filter(p => p.sesionId === sesionActiva.id);
  const totalBs = pagosSesion.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return {
    abierta: true,
    sesion: sesionActiva,
    totalBs,
    cantidadPagos: pagosSesion.length,
    pagos: pagosSesion
  };
}

/**
 * Abre una nueva sesión de caja para una cajera y turno determinados.
 *
 * @param {object} params
 * @param {string} params.cajera
 * @param {string} params.turno
 * @returns {{ ok: boolean, mensaje?: string, sesion?: object }}
 */
export function abrirCaja({ cajera, turno }) {
  const data = leerSesiones();

  if (data.sesionActiva) {
    return {
      ok: false,
      mensaje: `Ya existe una caja abierta con ${data.sesionActiva.cajera} (Turno: ${data.sesionActiva.turno})`,
      sesion: data.sesionActiva
    };
  }

  const ahora = new Date();
  const fechaApertura = ahora.toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  });

  const nuevaSesion = {
    id: `ses_${Date.now()}`,
    cajera: (cajera || 'Cajero(a)').trim(),
    turno: (turno || 'Mañana').trim(),
    fechaApertura,
    timestampApertura: ahora.getTime()
  };

  data.sesionActiva = nuevaSesion;
  guardarSesiones(data);

  return {
    ok: true,
    mensaje: `Caja abierta exitosamente para ${nuevaSesion.cajera}`,
    sesion: nuevaSesion
  };
}

/**
 * Cierra la sesión activa de caja, consolida los pagos recaudados y la archiva en el historial.
 *
 * @returns {{ ok: boolean, mensaje?: string, sesion?: object }}
 */
export function cerrarCaja() {
  const data = leerSesiones();

  if (!data.sesionActiva) {
    return {
      ok: false,
      mensaje: 'No hay ninguna sesión de caja abierta para cerrar.'
    };
  }

  const sesionActiva = data.sesionActiva;
  const todosLosPagos = obtenerPagos();
  const pagosSesion = todosLosPagos.filter(p => p.sesionId === sesionActiva.id);
  const totalBs = pagosSesion.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  const ahora = new Date();
  const fechaCierre = ahora.toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  });

  const sesionCerrada = {
    ...sesionActiva,
    fechaCierre,
    timestampCierre: ahora.getTime(),
    totalBs,
    cantidadPagos: pagosSesion.length,
    pagos: pagosSesion
  };

  data.historialSesiones = data.historialSesiones || [];
  data.historialSesiones.unshift(sesionCerrada);
  data.sesionActiva = null;
  guardarSesiones(data);

  return {
    ok: true,
    mensaje: `Caja cerrada exitosamente para ${sesionCerrada.cajera}`,
    sesion: sesionCerrada
  };
}

/**
 * Lee la lista completa de pagos verificados desde el archivo local.
 *
 * @returns {Array<object>}
 */
export function obtenerPagos() {
  asegurarArchivos();
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
 * Asigna automáticamente la sesión de caja activa si existe.
 *
 * @param {object} nuevoPago
 * @returns {boolean}
 */
export function guardarPago(nuevoPago) {
  asegurarArchivos();
  try {
    const sesionActiva = obtenerSesionActiva();
    if (sesionActiva) {
      nuevoPago.sesionId = sesionActiva.id;
      nuevoPago.cajera = sesionActiva.cajera;
      nuevoPago.turno = sesionActiva.turno;
    } else {
      nuevoPago.sesionId = null;
      nuevoPago.cajera = 'General';
      nuevoPago.turno = 'General';
    }

    const pagos = obtenerPagos();
    pagos.unshift(nuevoPago);
    fs.writeFileSync(DATA_FILE, JSON.stringify(pagos, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[storage.service] Error al guardar nuevo pago:', err.message);
    return false;
  }
}
