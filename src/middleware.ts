import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { Role } from "@/lib/types";
import type { NavFlags } from "@/lib/nav-flags";
import { canAccessPath, navCatalog, parseNavFlags } from "@/lib/nav-flags";
import { homeForRole } from "@/lib/rbac";

const financeRoles = ["ADM", "GESTOR", "DEVELOPER"] as Role[];

function fallbackHome(role: Role, flags: NavFlags): string {
  const preferred = homeForRole(role);
  if (canAccessPath(preferred, flags, role)) return preferred;
  const first = navCatalog(role).find((item) => flags[item.key]);
  return first?.href || preferred;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as Role | undefined;
    const path = req.nextUrl.pathname;

    if (!role || !token?.id) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const navFlags =
      (token.navFlags as NavFlags | undefined) || parseNavFlags("{}", role);
    const home = fallbackHome(role, navFlags);

    if (path === "/" && role === "VENDEDOR") {
      return NextResponse.redirect(new URL("/vendedor", req.url));
    }

    if (path.startsWith("/developer") && role !== "DEVELOPER") {
      return NextResponse.redirect(new URL(home, req.url));
    }

    const financePaths = ["/verba", "/descontos", "/produtos", "/usuarios", "/relatorios"];
    if (
      financePaths.some((p) => path.startsWith(p)) &&
      !financeRoles.includes(role)
    ) {
      return NextResponse.redirect(new URL(home, req.url));
    }

    if (!canAccessPath(path, navFlags, role)) {
      return NextResponse.redirect(new URL(home, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/login")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/vendedor/:path*",
    "/distribuidores/:path*",
    "/campanhas/:path*",
    "/extrato/:path*",
    "/alertas/:path*",
    "/verba/:path*",
    "/descontos/:path*",
    "/produtos/:path*",
    "/usuarios/:path*",
    "/relatorios/:path*",
    "/projecoes/:path*",
    "/developer/:path*",
  ],
};
