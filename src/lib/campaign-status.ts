import { CampaignStatus } from "@/lib/types";
import { startOfDay } from "date-fns";

export function computeCampaignStatus(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  current: CampaignStatus = CampaignStatus.RASCUNHO
): CampaignStatus {
  if (current === CampaignStatus.CANCELADA) return CampaignStatus.CANCELADA;
  if (!startDate || !endDate) return CampaignStatus.RASCUNHO;

  const today = startOfDay(new Date());
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (today < start) return CampaignStatus.AGENDADA;
  if (today > end) return CampaignStatus.ENCERRADA;
  return CampaignStatus.ATIVA;
}
