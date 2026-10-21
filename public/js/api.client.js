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
