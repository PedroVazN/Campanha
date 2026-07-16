import type { Role } from "@/lib/types";

export const NAV_FLAG_KEYS = [
  "home",
  "distribuidores",
  "campanhas",
  "projecoes",
  "extrato",
  "alertas",
  "verba",
  "descontos",
  "produtos",
  "usuarios",
  "relatorios",
  "developer",
] as const;

export type NavFlagKey = (typeof NAV_FLAG_KEYS)[number];

export type NavFlags = Record<NavFlagKey, boolean>;

export type NavItemDef = {
  key: NavFlagKey;
  href: string;
  label: string;
};

/** Catálogo canônico de abas (href de home depende do papel). */
export function navCatalog(role: Role): NavItemDef[] {
  const homeHref = role === "VENDEDOR" ? "/vendedor" : "/";
  return [
    { key: "home", href: homeHref, label: "Início" },
    { key: "distribuidores", href: "/distribuidores", label: "Distribuidores" },
    { key: "campanhas", href: "/campanhas", label: "Campanhas" },
    { key: "projecoes", href: "/projecoes", label: "Projeções" },
    { key: "extrato", href: "/extrato", label: "Extrato" },
    { key: "alertas", href: "/alertas", label: "Alertas" },
    { key: "verba", href: "/verba", label: "Verba" },
    { key: "descontos", href: "/descontos", label: "Descontos" },
    { key: "produtos", href: "/produtos", label: "Produtos" },
    { key: "usuarios", href: "/usuarios", label: "Usuários" },
    { key: "relatorios", href: "/relatorios", label: "Relatórios" },
    { key: "developer", href: "/developer", label: "Developer" },
  ];
}

export function emptyNavFlags(value = false): NavFlags {
  return Object.fromEntries(NAV_FLAG_KEYS.map((k) => [k, value])) as NavFlags;
}

/** Defaults iguais às abas atuais de cada papel. */
export function defaultNavFlagsForRole(role: Role): NavFlags {
  const flags = emptyNavFlags(false);
  flags.home = true;
  flags.distribuidores = true;
  flags.campanhas = true;
  flags.projecoes = true;
  flags.extrato = true;
  flags.alertas = true;

  if (role === "ADM" || role === "GESTOR") {
    flags.verba = true;
    flags.descontos = true;
    flags.produtos = true;
    flags.usuarios = true;
    flags.relatorios = true;
  }

  if (role === "DEVELOPER") {
    return emptyNavFlags(true);
  }

  return flags;
}

export function parseNavFlags(raw: string | null | undefined, role: Role): NavFlags {
  const defaults = defaultNavFlagsForRole(role);
  if (!raw || raw === "{}") return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    const flags = { ...defaults };
    for (const key of NAV_FLAG_KEYS) {
      if (typeof parsed[key] === "boolean") {
        flags[key] = parsed[key]!;
      }
    }
    // Developer sempre mantém acesso à tela master
    if (role === "DEVELOPER") {
      flags.developer = true;
      flags.home = true;
    }
    return flags;
  } catch {
    return defaults;
  }
}

export function serializeNavFlags(flags: NavFlags): string {
  return JSON.stringify(flags);
}

export function pathToNavFlag(pathname: string): NavFlagKey | null {
  if (pathname === "/" || pathname === "/vendedor" || pathname.startsWith("/vendedor/")) {
    return "home";
  }
  if (pathname.startsWith("/developer")) return "developer";
  if (pathname.startsWith("/distribuidores")) return "distribuidores";
  if (pathname.startsWith("/campanhas")) return "campanhas";
  if (pathname.startsWith("/projecoes")) return "projecoes";
  if (pathname.startsWith("/extrato")) return "extrato";
  if (pathname.startsWith("/alertas")) return "alertas";
  if (pathname.startsWith("/verba")) return "verba";
  if (pathname.startsWith("/descontos")) return "descontos";
  if (pathname.startsWith("/produtos")) return "produtos";
  if (pathname.startsWith("/usuarios")) return "usuarios";
  if (pathname.startsWith("/relatorios")) return "relatorios";
  return null;
}

export function canAccessPath(pathname: string, flags: NavFlags, role: Role): boolean {
  if (role === "DEVELOPER") return true;
  const key = pathToNavFlag(pathname);
  if (!key) return true;
  return flags[key] === true;
}
