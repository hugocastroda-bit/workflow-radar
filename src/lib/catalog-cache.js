/**
 * Sistema centralizado de caché para catálogos
 * Permite invalidar y refrescar datos de forma coordinada
 */

const catalogCache = {
  data: {},
  listeners: new Set()
};

// Registrar listener para cambios de caché
export function subscribeToCacheChanges(callback) {
  catalogCache.listeners.add(callback);
  return () => catalogCache.listeners.delete(callback);
}

// Notificar todos los listeners cuando cambia caché
function notifyListeners(type) {
  catalogCache.listeners.forEach(cb => cb(type));
}

// Invalida todo el caché
export function invalidateAllCache() {
  catalogCache.data = {};
  notifyListeners('all');
}

// Invalida un catálogo específico
export function invalidateCatalog(catalogType) {
  if (catalogCache.data[catalogType]) {
    delete catalogCache.data[catalogType];
  }
  notifyListeners(catalogType);
}

// Invalida múltiples catálogos
export function invalidateCatalogs(...types) {
  types.forEach(type => invalidateCatalog(type));
}

// Obtener datos cacheados
export function getCachedData(catalogType) {
  return catalogCache.data[catalogType] || null;
}

// Establecer datos cacheados
export function setCachedData(catalogType, data) {
  catalogCache.data[catalogType] = data;
  notifyListeners(catalogType);
}

// Limpiar todo
export function clearCache() {
  catalogCache.data = {};
}