/**
 * Controlador principal de la aplicación cliente
 * Verificador Mercantil P2C - Catador Empresas
 */

import { ApiClient } from './api.client.js';
import { UI, SoundEffects } from './ui.components.js';

let pagosActuales = [];

// Elementos DOM
const refInput = document.getElementById('inputReferencia');
const montoInput = document.getElementById('inputMonto');
const btnVerificar = document.getElementById('btnVerificar');
const spinner = document.getElementById('spinnerVerificar');
const cardResultado = document.getElementById('cardResultado');
const resultadoDefault = document.getElementById('resultadoDefault');
const resultadoContenido = document.getElementById('resultadoContenido');
const metricTotalBs = document.getElementById('metricTotalBs');
const metricCantidadPagos = document.getElementById('metricCantidadPagos');
const tablaBody = document.getElementById('tablaHistorialBody');
const filtroInput = document.getElementById('filtroHistorial');
const badgeModo = document.getElementById('badgeModo');
const btnSonido = document.getElementById('btnSonidoToggle');
const iconAudio = document.getElementById('iconAudioOn');

/**
 * Foco automático en el campo de referencia
 */
export function enfocarReferencia() {
  if (refInput && document.activeElement !== montoInput) {
    refInput.focus();
    refInput.select();
  }
}

/**
 * Carga inicial de datos desde el backend
 */
async function inicializarDatos() {
  const config = await ApiClient.getConfig();
  if (badgeModo) {
    const modo = (config.modo || 'mock').toUpperCase();
    badgeModo.textContent = modo;
  }
  await recargarHistorial();
}

/**
 * Recarga y renderiza el historial de pagos
 */
async function recargarHistorial() {
  pagosActuales = await ApiClient.getHistorial();
  UI.renderTablaHistorial(tablaBody, pagosActuales, copiarReferencia);
  UI.actualizarMetricas(pagosActuales, metricTotalBs, metricCantidadPagos);
}

/**
 * Acción de copiar referencia al portapapeles
 */
function copiarReferencia(ref) {
  navigator.clipboard.writeText(ref).then(() => {
    UI.toast(`Referencia ${ref} copiada`);
  });
}

/**
 * Ejecuta la verificación de pago móvil
 */
async function ejecutarVerificacion() {
  const referencia = refInput.value.trim();
  const monto = montoInput.value.trim();

  if (!referencia) {
    refInput.focus();
    refInput.classList.add('ring-2', 'ring-rose-500');
    setTimeout(() => refInput.classList.remove('ring-2', 'ring-rose-500'), 1000);
    return;
  }

  btnVerificar.disabled = true;
  spinner.classList.remove('hidden');

  try {
    const res = await ApiClient.verificar({
      referencia,
      monto,
      fechaPago: new Date().toISOString().slice(0, 10)
    });

    resultadoDefault.classList.add('hidden');
    resultadoContenido.classList.remove('hidden');

    if (res.status === 200 && res.data.estado === 'APROBADO') {
      UI.mostrarAprobado(cardResultado, resultadoContenido, res.data);
      refInput.value = '';
      montoInput.value = '';
      refInput.focus();
      await recargarHistorial();

    } else if (res.status === 409 || res.data.estado === 'DUPLICADO') {
      UI.mostrarDuplicado(cardResultado, resultadoContenido, res.data);
      refInput.select();

    } else if (res.status === 404 || res.data.estado === 'NO_ENCONTRADO') {
      UI.mostrarNoEncontrado(cardResultado, resultadoContenido, res.data);
      refInput.select();

    } else {
      cardResultado.className = 'rounded-3xl p-6 bg-slate-50 border border-slate-200 text-slate-800';
      resultadoContenido.innerHTML = `
        <div class="font-bold text-base text-slate-800">Aviso:</div>
        <div class="text-xs text-slate-600 mt-1">${res.data.mensaje || 'Error en la verificación'}</div>
      `;
      refInput.select();
    }

  } catch (err) {
    console.error('Error verificando pago:', err);
    alert('Error al conectar con el servidor local: ' + err.message);
  } finally {
    btnVerificar.disabled = false;
    spinner.classList.add('hidden');
  }
}

/**
 * Configuración de eventos de teclado y acciones de usuario
 */
function configurarEventos() {
  // Enter en cualquiera de los dos campos ejecuta la verificación de inmediato
  [refInput, montoInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ejecutarVerificacion();
      }
    });
  });

  // Escape reenfoca el campo de referencia
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      enfocarReferencia();
    }
  });

  // Clic en botón de verificar
  btnVerificar.addEventListener('click', ejecutarVerificacion);

  // Búsqueda en tiempo real
  filtroInput.addEventListener('input', () => {
    const q = filtroInput.value.toLowerCase().trim();
    if (!q) {
      UI.renderTablaHistorial(tablaBody, pagosActuales, copiarReferencia);
      return;
    }
    const filtrados = pagosActuales.filter(p =>
      (p.referenciaOficial && p.referenciaOficial.toLowerCase().includes(q)) ||
      (p.referenciaIngresada && p.referenciaIngresada.toLowerCase().includes(q)) ||
      (p.monto && p.monto.toString().includes(q))
    );
    UI.renderTablaHistorial(tablaBody, filtrados, copiarReferencia);
  });

  // Exportación a CSV
  document.getElementById('btnExportar').addEventListener('click', () => {
    UI.exportarCSV(pagosActuales);
  });

  // Toggle de sonido
  btnSonido.addEventListener('click', () => {
    const activo = SoundEffects.toggleSonido();
    if (activo) {
      iconAudio.className = 'w-5 h-5 text-sky-200';
      UI.toast('Audio: ACTIVADO');
    } else {
      iconAudio.className = 'w-5 h-5 text-slate-400 opacity-40';
      UI.toast('Audio: SILENCIADO');
    }
  });

  // Scroll suave al historial
  document.getElementById('btnScrollHistorial')?.addEventListener('click', () => {
    document.getElementById('seccionHistorial')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  inicializarDatos();
  enfocarReferencia();
});
