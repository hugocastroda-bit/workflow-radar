/**
 * Determina si el usuario actual puede ver un pedido confidencial.
 * Si el pedido NO es confidencial, siempre retorna true.
 * @param {object} pedido
 * @param {object} user - objeto user de base44.auth.me()
 * @param {string} [empresaRol] - rol del usuario en la empresa activa ("Admin" | "User")
 */
export function canVerConfidencial(pedido, user, empresaRol) {
  if (!pedido.confidencial) return true;
  if (!user) return false;
  // Admin global puede ver todo
  if (user.role === "admin") return true;
  // Admin a nivel empresa también puede ver todo
  if (empresaRol === "Admin") return true;
  if (pedido.created_by === user.email) return true;
  if (pedido.solicitante === user.full_name) return true;
  if (pedido.responsable === user.full_name) return true;
  return false;
}

/**
 * Filtra una lista de pedidos según visibilidad de confidencialidad.
 * @param {Array} pedidos
 * @param {object} user
 * @param {string} [empresaRol]
 */
export function filtrarConfidenciales(pedidos, user, empresaRol) {
  return pedidos.filter(p => canVerConfidencial(p, user, empresaRol));
}