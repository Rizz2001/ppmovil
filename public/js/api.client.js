/**
 * Cliente API para comunicación con el backend local del Verificador P2C.
 */

export const ApiClient = {
  /**
   * Obtiene la configuración pública activa (MODO, PUERTO, etc.).
   */
  async getConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ApiClient] Error obteniendo config:', err);
      return { modo: 'mock', puerto: 3000 };
    }
  },

  /**
   * Obtiene el historial de pagos almacenados localmente.
   */
  async getHistorial() {
    try {
      const res = await fetch('/api/historial');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ApiClient] Error obteniendo historial:', err);
      return [];
    }
  },

  /**
   * Obtiene el estado actual de la caja y la sesión activa.
   */
  async getCajaEstado() {
    try {
      const res = await fetch('/api/caja/estado');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ApiClient] Error obteniendo estado de caja:', err);
      return { abierta: false, sesion: null, totalBs: 0, cantidadPagos: 0, pagos: [] };
    }
  },

  /**
   * Abre la caja para una cajera y turno específicos.
   */
  async abrirCaja({ cajera, turno }) {
    const res = await fetch('/api/caja/abrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cajera, turno })
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },

  /**
   * Cierra la sesión activa de caja y obtiene el resumen consolidado para exportación.
   */
  async cerrarCaja() {
    const res = await fetch('/api/caja/cerrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  },

  /**
   * Envía una solicitud de verificación de pago móvil.
   *
   * @param {object} payload
   * @param {string} payload.referencia
   * @param {number} payload.monto
   * @param {string} [payload.fechaPago]
   * @param {string} [payload.telefonoCliente]
   */
  async verificar(payload) {
    const res = await fetch('/api/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return {
      status: res.status,
      ok: res.ok,
      data
    };
  }
};
