export const COMPANY_ROLES = {
  ADMIN: "Admin",
  USER: "User",
};

export const isGlobalAdmin = (user) => user?.role === "admin";

export const isCompanyAdmin = (empresaActiva) => empresaActiva?.rol === COMPANY_ROLES.ADMIN;

export const canManageCompanyUsers = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyAdmin(empresaActiva);

export const canManageCompanyConfig = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyAdmin(empresaActiva);

export const canManagePedidos = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyAdmin(empresaActiva);