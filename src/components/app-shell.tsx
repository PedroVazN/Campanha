"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileSpreadsheet,
  Home,
  LogOut,
  Package,
  Percent,
  ScrollText,
  TrendingUp,
  Users,
  Wallet,
  Megaphone,
  Code2,
} from "lucide-react";
import type { Role } from "@/lib/types";
import type { NavFlags } from "@/lib/nav-flags";
import { navForUser } from "@/lib/rbac";
import { roleLabels } from "@/lib/labels";
import { ProjectionReminder } from "@/components/projection-reminder";

type Props = {
  children: React.ReactNode;
  user: { name: string; email: string; role: Role; navFlags: NavFlags };
};

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "/": Home,
  "/vendedor": Home,
  "/developer": Code2,
  "/distribuidores": Building2,
  "/campanhas": Megaphone,
  "/projecoes": TrendingUp,
  "/extrato": ScrollText,
  "/alertas": AlertTriangle,
  "/verba": Wallet,
  "/descontos": Percent,
  "/produtos": Package,
  "/usuarios": Users,
  "/relatorios": FileSpreadsheet,
};

export function AppShell({ children, user }: Props) {
  const pathname = usePathname();
  const nav = navForUser(user.role, user.navFlags);

  function isActive(href: string) {
    if (href === "/" || href === "/vendedor") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[var(--sidebar-w)_1fr]">
      <aside className="shell-aside hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen text-on-dark border-r border-white/[0.06]">
        <div className="px-5 py-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[10px] font-bold leading-tight text-center tracking-tight"
              style={{
                background: "linear-gradient(145deg, #3b82f6, #1d4ed8)",
                boxShadow: "0 8px 20px rgb(37 99 235 / 35%)",
              }}
            >
              SGI
              <br />
              4.0
            </div>
            <div>
              <p className="font-display text-[1.05rem] font-bold tracking-tight text-on-dark">
                SGI 4.0
              </p>
              <p className="text-[11px] text-white/45 tracking-wide">Gestão integrada</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Principal">
          {nav.map((item) => {
            const active = isActive(item.href);
            const Icon = iconMap[item.href] || BarChart3;
            return (
              <Link
                key={item.key}
                href={item.href}
                data-active={active}
                className={clsx(
                  "shell-nav-item flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-white/[0.08] text-white pl-4"
                    : "text-white/55 hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <Icon
                  className={clsx("h-4 w-4 shrink-0", active ? "text-[#60a5fa]" : "opacity-80")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-3.5">
          <p className="text-sm font-semibold truncate text-white">{user.name}</p>
          <p className="text-[11px] text-white/45 mt-0.5 tracking-wide uppercase">
            {roleLabels[user.role]}
          </p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 inline-flex items-center gap-2 text-sm text-white/55 hover:text-[#60a5fa] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
        <header className="lg:hidden sticky top-0 z-20 h-[var(--header-h)] border-b border-line bg-surface/90 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-bold leading-tight text-center text-white"
              style={{ background: "linear-gradient(145deg, #3b82f6, #1d4ed8)" }}
            >
              SGI
              <br />
              4.0
            </div>
            <div>
              <p className="font-display text-sm font-bold text-ink leading-tight">SGI 4.0</p>
              <p className="text-[11px] text-muted leading-tight">
                {user.name} · {roleLabels[user.role]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-1.5 text-sm text-accent font-semibold cursor-pointer"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </header>

        <main id="conteudo-principal" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 fade-in">
          <div className="mx-auto w-full max-w-[1280px]">
            <ProjectionReminder role={user.role} />
            {children}
          </div>
        </main>
      </div>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom"
        aria-label="Mobile"
      >
        <div className="grid grid-cols-4 gap-0.5 px-1 py-1.5">
          {nav.slice(0, 4).map((item) => {
            const active = isActive(item.href);
            const Icon = iconMap[item.href] || Home;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2 rounded-[10px] text-[10px] font-semibold transition-colors min-h-[44px] justify-center",
                  active ? "text-accent bg-accent-soft" : "text-muted"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
