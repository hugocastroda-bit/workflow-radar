export const COMPANY_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  USER: "User",
};

export const isGlobalAdmin = (user) => user?.role === "admin";

export const isCompanyOwner = (empresaActiva) => empresaActiva?.rol === COMPANY_ROLES.OWNER;

export const isCompanyAdmin = (empresaActiva) =>
  [COMPANY_ROLES.OWNER, COMPANY_ROLES.ADMIN].includes(empresaActiva?.rol);

export const canManageCompanyUsers = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyOwner(empresaActiva);

export const canManageCompanyConfig = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyAdmin(empresaActiva);

export const canManagePedidos = (user, empresaActiva) =>
  isGlobalAdmin(user) || isCompanyAdmin(empresaActiva);
