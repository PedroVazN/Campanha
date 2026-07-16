import { prisma } from "./prisma";
import { computeCampaignStatus } from "./campaign-status";

/** Recalcula status de campanhas com base nas datas. */
export async function syncCampaignStatuses() {
  const campaigns = await prisma.campaign.findMany({
    where: { status: { not: "CANCELADA" } },
  });

  for (const c of campaigns) {
    const next = computeCampaignStatus(c.startDate, c.endDate, c.status as never);
    if (next !== c.status) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: next },
      });
    }
  }
}
