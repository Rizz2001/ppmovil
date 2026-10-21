/**
 * Controlador principal de la aplicación cliente
 * Verificador Mercantil P2C - Catador Empresas
 */

import { ApiClient } from './api.client.js';
import { UI, SoundEffects, Formatters } from './ui.components.js';

let pagosActuales = [];
let estadoCajaActual = { abierta: false, sesion: null, totalBs: 0, cantidadPagos: 0, pagos: [] };

// Elementos DOM del Formulario de Verificación
const refInput = document.getElementById('inputReferencia');
const montoInput = document.getElementById('inputMonto');
const telefonoInput = document.getElementById('inputTelefono');
const fechaInput = document.getElementById('inputFecha');
const btnHoy = document.getElementById('btnHoy');
const btnVerificar = document.getElementById('btnVerificar');
const spinner = document.getElementById('spinnerVerificar');
const cardResultado = document.getElementById('cardResultado');
const resultadoDefault = document.getElementById('resultadoDefault');
const resultadoContenido = document.getElementById('resultadoContenido');
const tablaBody = document.getElementById('tablaHistorialBody');
const filtroInput = document.getElementById('filtroHistorial');
const badgeModo = document.getElementById('badgeModo');
const btnSonido = document.getElementById('btnSonidoToggle');
const iconAudio = document.getElementById('iconAudioOn');

// Elementos DOM de Apertura y Cierre de Caja
const btnToggleCaja = document.getElementById('btnToggleCaja');
const btnCerrarCajaBanner = document.getElementById('btnCerrarCajaBanner');
const btnExportarHistorial = document.getElementById('btnExportarHistorial');

// Modal Abrir Caja
const modalAbrirCaja = document.getElementById('modalAbrirCaja');
const formAbrirCaja = document.getElementById('formAbrirCaja');
const inputCajera = document.getElementById('inputCajera');
const selectTurno = document.getElementById('selectTurno');
const btnCancelarAbrirCaja = document.getElementById('btnCancelarAbrirCaja');

// Modal Cerrar Caja
const modalCerrarCaja = document.getElementById('modalCerrarCaja');
const btnCancelarCerrarCaja = document.getElementById('btnCancelarCerrarCaja');
const btnConfirmarCerrarCaja = document.getElementById('btnConfirmarCerrarCaja');
const resumenCierreCajera = document.getElementById('resumenCierreCajera');
const resumenCierreTurno = document.getElementById('resumenCierreTurno');
const resumenCierreApertura = document.getElementById('resumenCierreApertura');
const resumenCierreCantidad = document.getElementById('resumenCierreCantidad');
const resumenCierreTotalBs = document.getElementById('resumenCierreTotalBs');

/**
 * Foco automático en el campo de referencia
 */
export function enfocarReferencia() {
  if (refInput && document.activeElement !== montoInput && document.activeElement !== telefonoInput) {
    refInput.focus();
    refInput.select();
  }
}

/**
 * Carga inicial de datos desde el backend
 */
async function inicializarDatos() {
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().slice(0, 10);
  }

  const config = await ApiClient.getConfig();
  if (badgeModo) {
    const modo = (config.modo || 'mock').toUpperCase();
    badgeModo.textContent = modo;
  }

  await recargarEstadoCaja();
  await recargarHistorial();
}

/**
 * Recarga y actualiza el estado de caja activo
 */
async function recargarEstadoCaja() {
  estadoCajaActual = await ApiClient.getCajaEstado();
  UI.renderEstadoCaja(estadoCajaActual);
}

/**
 * Recarga y renderiza el historial de pagos
 */
async function recargarHistorial() {
  pagosActuales = await ApiClient.getHistorial();
  UI.renderTablaHistorial(tablaBody, pagosActuales, copiarReferencia);
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
 * Abre el modal de apertura de caja
 */
function abrirModalApertura() {
  if (modalAbrirCaja) {
    modalAbrirCaja.classList.remove('hidden');
    setTimeout(() => inputCajera?.focus(), 50);
  }
}

/**
 * Cierra el modal de apertura de caja
 */
function cerrarModalApertura() {
  if (modalAbrirCaja) {
    modalAbrirCaja.classList.add('hidden');
    formAbrirCaja?.reset();
    enfocarReferencia();
  }
}

/**
 * Abre el modal de cierre de caja con los datos consolidados del turno
 */
async function abrirModalCierre() {
  await recargarEstadoCaja();
  if (!estadoCajaActual.abierta || !estadoCajaActual.sesion) {
    UI.toast('No hay una caja abierta actualmente.');
    abrirModalApertura();
    return;
  }

  const { sesion, totalBs, cantidadPagos } = estadoCajaActual;
  if (resumenCierreCajera) resumenCierreCajera.textContent = sesion.cajera;
  if (resumenCierreTurno) resumenCierreTurno.textContent = sesion.turno;
  if (resumenCierreApertura) resumenCierreApertura.textContent = sesion.fechaApertura;
  if (resumenCierreCantidad) resumenCierreCantidad.textContent = `${cantidadPagos} Pagos Aprobados`;
  if (resumenCierreTotalBs) resumenCierreTotalBs.textContent = Formatters.formatoBs(totalBs);

  if (modalCerrarCaja) {
    modalCerrarCaja.classList.remove('hidden');
  }
}

/**
 * Cierra el modal de cierre de caja
 */
function cerrarModalCierre() {
  if (modalCerrarCaja) {
    modalCerrarCaja.classList.add('hidden');
    enfocarReferencia();
  }
}

/**
 * Ejecuta la verificación de pago móvil
 */
async function ejecutarVerificacion() {
  // Validar si la caja está abierta
  if (!estadoCajaActual.abierta) {
    UI.toast('⚠️ Debes abrir caja para registrar pagos.');
    abrirModalApertura();
    return;
  }

  const referencia = refInput.value.trim();
  const monto = montoInput.value.trim();
  const telefonoCliente = telefonoInput ? telefonoInput.value.trim() : '';
  const fechaPago = (fechaInput && fechaInput.value) ? fechaInput.value.trim() : new Date().toISOString().slice(0, 10);

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
      fechaPago,
      telefonoCliente
    });

    resultadoDefault.classList.add('hidden');
    resultadoContenido.classList.remove('hidden');

    if (res.status === 200 && res.data.estado === 'APROBADO') {
      UI.mostrarAprobado(cardResultado, resultadoContenido, res.data);
      refInput.value = '';
      montoInput.value = '';
      if (telefonoInput) telefonoInput.value = '';
      refInput.focus();
      await recargarHistorial();
      await recargarEstadoCaja();

    } else if (res.status === 409 || res.data.estado === 'DUPLICADO') {
      UI.mostrarDuplicado(cardResultado, resultadoContenido, res.data);
      refInput.select();

    } else if (res.status === 404 || res.data.estado === 'NO_ENCONTRADO') {
      UI.mostrarNoEncontrado(cardResultado, resultadoContenido, res.data);
      refInput.select();

    } else if (res.data.estado === 'CAJA_CERRADA') {
      UI.toast(res.data.mensaje);
      abrirModalApertura();
    } else {
      cardResultado.className = 'rounded-3xl p-6 bg-slate-50 border border-slate-200 text-slate-800';
      resultadoContenido.innerHTML = `
        <div class="font-bold text-base text-slate-800">Aviso del Sistema:</div>
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
 * Configuración de eventos de usuario
 */
function configurarEventos() {
  // Enter en cualquiera de los campos ejecuta la verificación de inmediato
  [refInput, montoInput, telefonoInput, fechaInput].filter(Boolean).forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ejecutarVerificacion();
      }
    });
  });

  // Botón "Hoy"
  btnHoy?.addEventListener('click', () => {
    if (fechaInput) {
      fechaInput.value = new Date().toISOString().slice(0, 10);
      UI.toast('Fecha ajustada a Hoy');
    }
  });

  // Escape cierra modales o reenfoca referencia
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalAbrirCaja.classList.contains('hidden')) {
        cerrarModalApertura();
      } else if (!modalCerrarCaja.classList.contains('hidden')) {
        cerrarModalCierre();
      } else {
        enfocarReferencia();
      }
    }
  });

  // Clic en botón de verificar
  btnVerificar.addEventListener('click', ejecutarVerificacion);

  // Botón toggle de caja en header
  btnToggleCaja?.addEventListener('click', () => {
    if (estadoCajaActual.abierta) {
      abrirModalCierre();
    } else {
      abrirModalApertura();
    }
  });

  // Botón en el banner derecho
  btnCerrarCajaBanner?.addEventListener('click', () => {
    if (estadoCajaActual.abierta) {
      abrirModalCierre();
    } else {
      abrirModalApertura();
    }
  });

  // Envío del formulario de apertura de caja
  formAbrirCaja?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cajera = inputCajera.value.trim();
    const turno = selectTurno.value;

    if (!cajera) {
      inputCajera.focus();
      return;
    }

    const res = await ApiClient.abrirCaja({ cajera, turno });
    if (res.ok) {
      UI.toast(`✅ Caja abierta para ${res.data.sesion.cajera}`);
      cerrarModalApertura();
      await recargarEstadoCaja();
      await recargarHistorial();
      enfocarReferencia();
    } else {
      alert(res.data.mensaje || 'Error al abrir caja');
    }
  });

  btnCancelarAbrirCaja?.addEventListener('click', cerrarModalApertura);

  // Confirmar Cierre de Caja y descarga de reporte
  btnConfirmarCerrarCaja?.addEventListener('click', async () => {
    btnConfirmarCerrarCaja.disabled = true;
    try {
      const res = await ApiClient.cerrarCaja();
      if (res.ok && res.data.sesion) {
        // Descargar reporte formal de cierre con nombre de cajera y turno
        UI.exportarCierreCaja(res.data.sesion);
        UI.toast(`Caja cerrada. Reporte de ${res.data.sesion.cajera} descargado.`);
        cerrarModalCierre();
        await recargarEstadoCaja();
        await recargarHistorial();
      } else {
        alert(res.data.mensaje || 'Error al cerrar caja');
      }
    } catch (err) {
      alert('Error cerrando caja: ' + err.message);
    } finally {
      btnConfirmarCerrarCaja.disabled = false;
    }
  });

  btnCancelarCerrarCaja?.addEventListener('click', cerrarModalCierre);

  // Búsqueda en tiempo real
  filtroInput.addEventListener('input', () => {
    const q = filtroInput.value.toLowerCase().trim();
    if (!q) {
      UI.renderTablaHistorial(tablaBody, pagosActuales, copiarReferencia);
      return;
    }
    const filtrados = pagosActuales.filter(p =>
      (p.referenciaOficial && p.referenciaOficial.toString().toLowerCase().includes(q)) ||
      (p.referenciaIngresada && p.referenciaIngresada.toString().toLowerCase().includes(q)) ||
      (p.telefonoCliente && p.telefonoCliente.toString().toLowerCase().includes(q)) ||
      (p.monto && p.monto.toString().includes(q))
    );
    UI.renderTablaHistorial(tablaBody, filtrados, copiarReferencia);
  });

  // Exportación completa
  btnExportarHistorial?.addEventListener('click', () => {
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
