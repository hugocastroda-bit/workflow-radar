/**
 * Determina si el usuario actual puede ver un pedido confidencial.
 * Si el pedido NO es confidencial, siempre retorna true.
 */
export function canVerConfidencial(pedido, user) {
  if (!pedido.confidencial) return true;
  if (!user) return false;
  if (user.role === "admin") return true;
  if (pedido.created_by === user.email) return true;
  if (pedido.solicitante === user.full_name) return true;
  if (pedido.responsable === user.full_name) return true;
  return false;
}

/**
 * Filtra una lista de pedidos según visibilidad de confidencialidad.
 */
export function filtrarConfidenciales(pedidos, user) {
  return pedidos.filter(p => canVerConfidencial(p, user));
}