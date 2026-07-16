import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import type { Role } from "@/lib/types";
import { homeForRole } from "./rbac";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }
  return session;
}
