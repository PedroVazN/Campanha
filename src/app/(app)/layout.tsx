import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { syncCampaignStatuses } from "@/lib/sync-campaigns";
import { parseNavFlags } from "@/lib/nav-flags";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  await syncCampaignStatuses();

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { navFlags: true, role: true },
  });
  const role = (dbUser?.role || session.user.role) as Role;
  const navFlags =
    session.user.navFlags || parseNavFlags(dbUser?.navFlags, role);

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role,
        navFlags,
      }}
    >
      {children}
    </AppShell>
  );
}
