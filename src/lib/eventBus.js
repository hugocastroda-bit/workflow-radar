/**
 * Event Bus centralizado para sincronización de cambios entre vistas
 * Permite que las diferentes vistas se mantengan sincronizadas sin recargar la app
 */

const listeners = new Map();

export const eventBus = {
  /**
   * Emitir un evento
   * @param {string} eventName - Nombre del evento (ej: 'pedidoCreado', 'pedidoActualizado')
   * @param {any} data - Datos del evento
   */
  emit(eventName, data) {
    if (!listeners.has(eventName)) return;
    listeners.get(eventName).forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error en listener de ${eventName}:`, err);
      }
    });
  },

  /**
   * Escuchar un evento
   * @param {string} eventName - Nombre del evento
   * @param {function} callback - Función a ejecutar
   * @returns {function} Función para desinscribirse
   */
  on(eventName, callback) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(callback);

    // Retornar función para desuscribirse
    return () => {
      listeners.get(eventName).delete(callback);
    };
  },

  /**
   * Desinscribirse de un evento
   */
  off(eventName, callback) {
    if (!listeners.has(eventName)) return;
    listeners.get(eventName).delete(callback);
  },

  /**
   * Limpiar todos los listeners (para testing)
   */
  clear() {
    listeners.clear();
  }
};

/**
 * Eventos que la aplicación emite:
 * 
 * - pedidoCreado(pedido) - Se creó un pedido
 * - pedidoActualizado(pedido) - Se actualizó un pedido
 * - pedidoArchivado(pedidoId) - Se archivó un pedido
 * - pedidoRestaurado(pedido) - Se restauró un pedido
 * - pedidoEliminado(pedidoId) - Se eliminó un pedido
 * - pedidoEstadoCambiado(pedido) - Cambió el estado del pedido (usado en Kanban)
 * 
 * - responsableCreado(responsable) - Se creó un responsable
 * - responsableActualizado(responsable) - Se actualizó un responsable
 * - solicitanteActualizado() - Se actualizaron solicitantes
 * - procesoActualizado() - Se actualizaron procesos
 * - prioridadActualizada() - Se actualizaron prioridades
 * 
 * - catalogoInvalidado(type) - Se invalidó un catálogo (solicitantes, responsables, etc)
 */