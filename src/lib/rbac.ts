import type { Role } from "@/lib/types";
import {
  type NavFlags,
  navCatalog,
  parseNavFlags,
} from "@/lib/nav-flags";

export type AppRole = Role;

export function isDeveloper(role: Role): boolean {
  return role === "DEVELOPER";
}

export function canManageFinance(role: Role): boolean {
  return role === "ADM" || role === "GESTOR" || role === "DEVELOPER";
}

export function canManageProducts(role: Role): boolean {
  return role === "ADM" || role === "GESTOR" || role === "DEVELOPER";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADM" || role === "GESTOR" || role === "DEVELOPER";
}

export function canCreateCampaign(role: Role): boolean {
  return role === "VENDEDOR" || role === "ADM" || role === "GESTOR" || role === "DEVELOPER";
}

export function canSeeAllDistributors(role: Role): boolean {
  return role === "ADM" || role === "GESTOR" || role === "DEVELOPER";
}

export function homeForRole(role: Role): string {
  if (role === "VENDEDOR") return "/vendedor";
  if (role === "ADM") return "/distribuidores";
  if (role === "DEVELOPER") return "/developer";
  return "/";
}

/** Abas padrão do papel (sem filtrar por flags). */
export const navForRole = (role: Role) => {
  const defaults = parseNavFlags("{}", role);
  return navForUser(role, defaults);
};

/** Abas visíveis após aplicar flags do usuário. */
export function navForUser(role: Role, flags: NavFlags | string) {
  const resolved = typeof flags === "string" ? parseNavFlags(flags, role) : flags;
  return navCatalog(role).filter((item) => resolved[item.key] === true);
}
