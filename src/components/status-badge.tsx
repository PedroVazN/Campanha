import clsx from "clsx";
import type { CampaignStatus } from "@/lib/types";
import { campaignStatusLabels } from "@/lib/labels";

const styles: Record<CampaignStatus, string> = {
  RASCUNHO: "bg-spent-soft text-spent ring-1 ring-line",
  AGENDADA: "bg-accent-soft text-accent ring-1 ring-accent/25",
  ATIVA: "bg-fund-soft text-fund ring-1 ring-fund/25",
  ENCERRADA: "bg-paper text-muted ring-1 ring-line",
  CANCELADA: "bg-critical-soft text-critical ring-1 ring-critical/25",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as CampaignStatus;
  return (
    <span className={clsx("badge", styles[s])}>{campaignStatusLabels[s]}</span>
  );
}
