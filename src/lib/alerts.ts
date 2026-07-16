import { CampaignStatus } from "@/lib/types";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "./prisma";
import { LOW_BALANCE_THRESHOLD } from "./money";
import {
  isProjectionReminderWindow,
  PROJECTION_REMINDER_BODY,
  PROJECTION_REMINDER_TITLE,
} from "./projection-reminder";

export type AlertItem = {
  id: string;
  type:
    | "LOW_BALANCE"
    | "NO_BALANCE"
    | "CAMPAIGN_ENDING"
    | "NO_CAMPAIGN"
    | "PROJECTION_REMINDER";
  title: string;
  detail: string;
  href?: string;
  severity: "warn" | "critical" | "info";
};

export async function getAlerts(options?: {
  sellerId?: string;
  distributorIds?: string[];
  includeProjectionReminder?: boolean;
}): Promise<AlertItem[]> {
  const whereDist = options?.sellerId
    ? { sellerId: options.sellerId }
    : options?.distributorIds
      ? { id: { in: options.distributorIds } }
      : {};

  const distributors = await prisma.distributor.findMany({
    where: whereDist,
    include: {
      campaigns: {
        where: { status: { not: CampaignStatus.CANCELADA } },
      },
    },
    orderBy: { name: "asc" },
  });

  const alerts: AlertItem[] = [];
  const now = startOfDay(new Date());
  const in7 = addDays(now, 7);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (options?.includeProjectionReminder && isProjectionReminderWindow()) {
    alerts.push({
      id: "proj-reminder",
      type: "PROJECTION_REMINDER",
      title: PROJECTION_REMINDER_TITLE,
      detail: PROJECTION_REMINDER_BODY,
      href: "/projecoes",
      severity: "warn",
    });
  }

  for (const d of distributors) {
    if (d.balance <= 0) {
      alerts.push({
        id: `nob-${d.id}`,
        type: "NO_BALANCE",
        title: "Sem verba disponível",
        detail: `${d.name} está com saldo zerado.`,
        href: `/distribuidores/${d.id}`,
        severity: "critical",
      });
    } else if (d.balance < LOW_BALANCE_THRESHOLD) {
      alerts.push({
        id: `low-${d.id}`,
        type: "LOW_BALANCE",
        title: "Verba baixa",
        detail: `${d.name} tem pouco saldo disponível.`,
        href: `/distribuidores/${d.id}`,
        severity: "warn",
      });
    }

    const hasCampaignThisMonth = d.campaigns.some(
      (c) => c.referenceMonth === month && c.referenceYear === year
    );
    if (!hasCampaignThisMonth) {
      alerts.push({
        id: `nc-${d.id}`,
        type: "NO_CAMPAIGN",
        title: "Sem campanha no mês",
        detail: `${d.name} ainda não tem campanha cadastrada neste mês.`,
        href: `/campanhas/nova`,
        severity: "info",
      });
    }

    for (const c of d.campaigns) {
      if (
        c.status === CampaignStatus.ATIVA &&
        c.endDate &&
        startOfDay(c.endDate) >= now &&
        startOfDay(c.endDate) <= in7
      ) {
        alerts.push({
          id: `end-${c.id}`,
          type: "CAMPAIGN_ENDING",
          title: "Campanha próxima do encerramento",
          detail: `${c.name} (${d.name}) encerra em breve.`,
          href: `/campanhas`,
          severity: "warn",
        });
      }
    }
  }

  return alerts;
}
