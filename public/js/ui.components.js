/**
 * Componentes de interfaz, sintetizador de audio y renderizado visual
 * Sistema de Diseño: Clean Soft Dashboard (Azul Rey + Azul Cielo)
 */

let audioCtx = null;
let sonidoActivado = true;

// Web Audio API: Inicializador seguro bajo demanda
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const SoundEffects = {
  toggleSonido() {
    sonidoActivado = !sonidoActivado;
    return sonidoActivado;
  },
  
  estaActivado() {
    return sonidoActivado;
  },

  // Sonido para estado APROBADO: Acorde armónico en Do Mayor
  playAprobado() {
    if (!sonidoActivado) return;
    try {
      const ctx = getAudioContext();
      const notas = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notas.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.05));
        gain.gain.setValueAtTime(0.001, ctx.currentTime + (idx * 0.05));
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + (idx * 0.05) + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (idx * 0.05) + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + (idx * 0.05));
        osc.stop(ctx.currentTime + (idx * 0.05) + 0.5);
      });
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  },

  // Sonido para estado DUPLICADO: Doble tono suave de advertencia
  playDuplicado() {
    if (!sonidoActivado) return;
    try {
      const ctx = getAudioContext();
      [440, 370].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.16));
        gain.gain.setValueAtTime(0.16, ctx.currentTime + (idx * 0.16));
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.16) + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + (idx * 0.16));
        osc.stop(ctx.currentTime + (idx * 0.16) + 0.25);
      });
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  },

  // Sonido para estado NO ENCONTRADO: Tono discreto descendente
  playNoEncontrado() {
    if (!sonidoActivado) return;
    try {
      const ctx = getAudioContext();
      [220, 180].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.18));
        gain.gain.setValueAtTime(0.22, ctx.currentTime + (idx * 0.18));
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.18) + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + (idx * 0.18));
        osc.stop(ctx.currentTime + (idx * 0.18) + 0.3);
      });
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  }
};

export const Formatters = {
  // Formateador estándar de moneda en Bolívares (es-VE)
  formatoBs(monto) {
    const num = Number(monto) || 0;
    return 'Bs. ' + num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};

export const UI = {
  /**
   * Renderiza el estado APROBADO de manera sobria y moderna
   */
  mostrarAprobado(cardEl, contenidoEl, data) {
    cardEl.className = 'rounded-3xl p-6 lg:p-8 transition-all duration-300 border border-emerald-300 bg-emerald-50/70 text-emerald-950 shadow-sm';
    
    contenidoEl.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-emerald-600/20 flex-shrink-0">
            ✓
          </div>
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200/80 text-emerald-900 uppercase tracking-wider mb-1.5">
              Aprobado
            </span>
            <h3 class="text-xl lg:text-2xl font-extrabold text-emerald-950 tracking-tight">
              Pago móvil aprobado - ${data.fechaHora}
            </h3>
            <div class="mt-2 flex flex-wrap items-center gap-2.5 text-xs">
              <span class="text-emerald-800 font-medium">Referencia Oficial:</span>
              <span class="font-mono font-bold bg-white text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200">
                ${data.referencia}
              </span>
              <span class="text-emerald-700 font-normal">(12 dígitos)</span>
            </div>
          </div>
        </div>

        <div class="text-left md:text-right bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex-shrink-0">
          <div class="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Monto Aprobado</div>
          <div class="text-2xl font-black text-emerald-950 tracking-tight mt-0.5">
            ${Formatters.formatoBs(data.monto)}
          </div>
        </div>
      </div>
    `;

    SoundEffects.playAprobado();
  },

  /**
   * Renderiza el estado DUPLICADO
   */
  mostrarDuplicado(cardEl, contenidoEl, data) {
    cardEl.className = 'rounded-3xl p-6 lg:p-8 transition-all duration-300 border border-amber-300 bg-amber-50/80 text-amber-950 shadow-sm';

    contenidoEl.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-amber-500/20 flex-shrink-0">
          !
        </div>
        <div class="flex-1">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 uppercase tracking-wider mb-1.5">
            Comprobante Ya Registrado
          </span>
          <h3 class="text-xl font-black text-amber-950 tracking-tight">
            ⚠️ PAGO YA UTILIZADO ANTERIORMENTE
          </h3>
          <p class="text-xs text-amber-800 font-medium mt-1">
            Esta referencia ya fue verificada y procesada previamente en este punto de venta.
          </p>
          <div class="mt-3.5 p-3.5 rounded-2xl bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span class="font-bold text-amber-800 uppercase text-[10px] block">Primer Registro:</span>
              <div class="font-semibold text-slate-800 mt-0.5">${data.fechaHoraUsoOriginal || 'Previamente registrado'}</div>
            </div>
            <div>
              <span class="font-bold text-amber-800 uppercase text-[10px] block">Referencia Oficial:</span>
              <div class="font-mono font-bold text-amber-950 mt-0.5">${data.referencia}</div>
            </div>
            <div>
              <span class="font-bold text-amber-800 uppercase text-[10px] block">Monto:</span>
              <div class="font-bold text-slate-800 mt-0.5">${Formatters.formatoBs(data.monto)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    SoundEffects.playDuplicado();
  },

  /**
   * Renderiza el estado NO ENCONTRADO
   */
  mostrarNoEncontrado(cardEl, contenidoEl, data) {
    cardEl.className = 'rounded-3xl p-6 lg:p-8 transition-all duration-300 border border-rose-300 bg-rose-50/80 text-rose-950 shadow-sm';

    contenidoEl.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-rose-600/20 flex-shrink-0">
          ✕
        </div>
        <div>
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-200/80 text-rose-900 uppercase tracking-wider mb-1.5">
            No Liquidado
          </span>
          <h3 class="text-xl font-black text-rose-950 tracking-tight">
            ❌ Pago móvil no encontrado en Banco Mercantil
          </h3>
          <p class="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
            La referencia <strong class="font-mono font-bold">${data.referencia || ''}</strong> no fue encontrada en la cámara de compensación. Solicita al cliente verificar el comprobante del banco emisor.
          </p>
        </div>
      </div>
    `;

    SoundEffects.playNoEncontrado();
  },

  /**
   * Renderiza las filas de la tabla de historial
   */
  renderTablaHistorial(tbodyEl, pagos, onCopiar) {
    if (!pagos || pagos.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-slate-400">
            <div class="flex flex-col items-center justify-center gap-1.5">
              <span class="text-2xl opacity-60">📋</span>
              <span class="font-semibold text-slate-600 text-xs">Sin transacciones registradas</span>
              <span class="text-[11px] text-slate-400">Los pagos aprobados se registrarán automáticamente aquí</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbodyEl.innerHTML = pagos.map(p => `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 pl-2 font-medium text-slate-500 whitespace-nowrap">
          ${p.fechaHoraRegistro || p.fechaPago}
        </td>
        <td class="py-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
          ${p.referenciaOficial}
        </td>
        <td class="py-3.5 font-mono text-slate-400">
          ${p.referenciaIngresada || '-'}
        </td>
        <td class="py-3.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
          ${p.telefonoCliente && p.telefonoCliente !== 'No especificado' ? p.telefonoCliente : '-'}
        </td>
        <td class="py-3.5 text-right font-extrabold text-slate-800 whitespace-nowrap">
          ${Formatters.formatoBs(p.monto)}
        </td>
        <td class="py-3.5 text-center">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Aprobado
          </span>
        </td>
        <td class="py-3.5 text-center">
          <button data-ref="${p.referenciaOficial}" class="btn-copiar p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors" title="Copiar referencia">
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');

    tbodyEl.querySelectorAll('.btn-copiar').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        if (ref && onCopiar) onCopiar(ref);
      });
    });
  },

  /**
   * Actualiza el widget de métricas de la tarjeta banner
   */
  actualizarMetricas(pagos, totalEl, cantidadEl) {
    const total = (pagos || []).reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
    totalEl.textContent = Formatters.formatoBs(total);
    cantidadEl.textContent = `${(pagos || []).length} Pagos`;
  },

  /**
   * Exporta la lista completa de pagos en formato CSV
   */
  exportarCSV(pagos) {
    if (!pagos || pagos.length === 0) {
      alert('No hay transacciones registradas para exportar.');
      return;
    }

    let csv = '\uFEFF';
    csv += 'Fecha y Hora;Referencia Oficial (12 digitos);Referencia Ingresada;Telefono Pagador;Monto (Bs.);Estado;Cajera;Turno\r\n';

    pagos.forEach(p => {
      const fila = [
        `"${p.fechaHoraRegistro || p.fechaPago || ''}"`,
        `"${p.referenciaOficial || ''}"`,
        `"${p.referenciaIngresada || ''}"`,
        `"${p.telefonoCliente || ''}"`,
        `"${(p.monto || 0).toString().replace('.', ',')}"`,
        `"APROBADO"`,
        `"${p.cajera || 'General'}"`,
        `"${p.turno || 'General'}"`
      ];
      csv += fila.join(';') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const hoy = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Mercantil_P2C_Historial_Completo_${hoy}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Genera y descarga el reporte oficial de cierre de caja con los datos de la cajera y turno
   */
  exportarCierreCaja(sesion) {
    if (!sesion) return;
    const cajera = (sesion.cajera || 'Cajera').trim();
    const turno = (sesion.turno || 'General').trim();
    const pagos = sesion.pagos || [];

    let csv = '\uFEFF';
    csv += '=========================================================================\r\n';
    csv += 'REPORTE OFICIAL DE CIERRE DE CAJA - PAGOS MOVILES BANCO MERCANTIL\r\n';
    csv += 'Catador Empresas\r\n';
    csv += '=========================================================================\r\n';
    csv += `Cajera(o) Asignada:;${cajera}\r\n`;
    csv += `Turno:;${turno}\r\n`;
    csv += `Fecha y Hora de Apertura:;${sesion.fechaApertura || ''}\r\n`;
    csv += `Fecha y Hora de Cierre:;${sesion.fechaCierre || ''}\r\n`;
    csv += `Total Pagos Aprobados:;${sesion.cantidadPagos || pagos.length}\r\n`;
    csv += `Monto Total Recaudado (Bs.):;${Formatters.formatoBs(sesion.totalBs || 0)}\r\n`;
    csv += '=========================================================================\r\n\r\n';
    csv += 'DETALLE DE TRANSACCIONES APROBADAS EN ESTE TURNO:\r\n';
    csv += 'Fecha y Hora;Referencia Oficial (12 digitos);Ref. Ingresada;Telefono Pagador;Monto (Bs.);Estado\r\n';

    pagos.forEach(p => {
      const fila = [
        `"${p.fechaHoraRegistro || p.fechaPago || ''}"`,
        `"${p.referenciaOficial || ''}"`,
        `"${p.referenciaIngresada || ''}"`,
        `"${p.telefonoCliente || ''}"`,
        `"${(p.monto || 0).toString().replace('.', ',')}"`,
        `"APROBADO"`
      ];
      csv += fila.join(';') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const cajeraLimpia = cajera.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
    const turnoLimpio = turno.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
    const hoy = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Cierre_Caja_${cajeraLimpia}_Turno_${turnoLimpio}_${hoy}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Actualiza los elementos visuales del estado de caja en la interfaz
   */
  renderEstadoCaja(estado) {
    const indicatorDot = document.getElementById('cajaIndicatorDot');
    const statusText = document.getElementById('cajaStatusText');
    const detalleText = document.getElementById('cajaDetalleText');
    const textoToggle = document.getElementById('textoToggleCaja');
    const btnToggle = document.getElementById('btnToggleCaja');
    const iconToggle = document.getElementById('iconToggleCaja');
    const cajeraLabel = document.getElementById('metricCajeraLabel');
    const metricTotal = document.getElementById('metricTotalBs');
    const metricCantidad = document.getElementById('metricCantidadPagos');
    const btnCerrarBanner = document.getElementById('btnCerrarCajaBanner');
    const btnCerrarBannerTexto = document.getElementById('btnCerrarCajaTexto');
    const iconCerrarBanner = document.getElementById('iconCerrarCajaBanner');

    if (estado && estado.abierta && estado.sesion) {
      const { sesion, totalBs, cantidadPagos } = estado;
      
      // Header widget
      if (indicatorDot) indicatorDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
      if (statusText) statusText.textContent = 'Caja Abierta';
      if (detalleText) detalleText.textContent = `${sesion.cajera} • ${sesion.turno}`;

      // Botón Header
      if (textoToggle) textoToggle.textContent = 'Cerrar Turno';
      if (btnToggle) {
        btnToggle.className = 'px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white active:scale-95 cursor-pointer';
      }
      if (iconToggle) {
        iconToggle.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>';
      }

      // Banner derecho
      if (cajeraLabel) cajeraLabel.textContent = `Cajera: ${sesion.cajera} (${sesion.turno})`;
      if (metricTotal) metricTotal.textContent = Formatters.formatoBs(totalBs);
      if (metricCantidad) metricCantidad.textContent = `${cantidadPagos} Pagos`;

      if (btnCerrarBannerTexto) btnCerrarBannerTexto.textContent = 'Cerrar Caja y Exportar';
      if (btnCerrarBanner) {
        btnCerrarBanner.className = 'w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer';
      }
      if (iconCerrarBanner) {
        iconCerrarBanner.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
      }

    } else {
      // Caja cerrada
      if (indicatorDot) indicatorDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
      if (statusText) statusText.textContent = 'Caja Cerrada';
      if (detalleText) detalleText.textContent = 'Sin turno activo';

      // Botón Header
      if (textoToggle) textoToggle.textContent = 'Abrir Caja';
      if (btnToggle) {
        btnToggle.className = 'px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white active:scale-95 cursor-pointer';
      }
      if (iconToggle) {
        iconToggle.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>';
      }

      // Banner derecho
      if (cajeraLabel) cajeraLabel.textContent = 'Caja Cerrada';
      if (metricTotal) metricTotal.textContent = 'Bs. 0,00';
      if (metricCantidad) metricCantidad.textContent = '0 Pagos';

      if (btnCerrarBannerTexto) btnCerrarBannerTexto.textContent = 'Abrir Caja (Iniciar Turno)';
      if (btnCerrarBanner) {
        btnCerrarBanner.className = 'w-full py-3.5 px-5 bg-white text-blue-700 hover:bg-blue-50 active:scale-[0.98] font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer';
      }
      if (iconCerrarBanner) {
        iconCerrarBanner.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>';
      }
    }
  },

  /**
   * Muestra un mensaje flotante tipo Toast
   */
  toast(msg) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl z-50 transition-all transform duration-200 translate-y-2 opacity-0';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.remove('translate-y-2', 'opacity-0');
    }, 20);
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 250);
    }, 2000);
  }
};
