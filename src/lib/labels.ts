import type {
  CampaignCategory,
  CampaignStatus,
  DiscountCategory,
  Role,
} from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  VENDEDOR: "Vendedor",
  ADM: "Administrador",
  GESTOR: "Gestor",
  DEVELOPER: "Developer",
};

export const campaignCategoryLabels: Record<CampaignCategory, string> = {
  SELL_OUT: "Sell Out",
  VENDEU_GANHOU: "Vendeu Ganhou",
  PERSONALIZADA: "Campanha Personalizada",
};

export function labelCampaignCategory(cat: string): string {
  return campaignCategoryLabels[cat as CampaignCategory] || cat;
}

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  RASCUNHO: "Rascunho",
  AGENDADA: "Agendada",
  ATIVA: "Ativa",
  ENCERRADA: "Encerrada",
  CANCELADA: "Cancelada",
};

export function labelCampaignStatus(status: string): string {
  return campaignStatusLabels[status as CampaignStatus] || status;
}

export const discountCategoryLabels: Record<DiscountCategory, string> = {
  SELL_IN: "Sell In",
  SELL_OUT: "Sell Out",
  VENDEU_GANHOU: "Vendeu Ganhou",
  CAMPANHA: "Campanha",
  OUTROS: "Outros",
};

export function labelDiscountCategory(cat: string | null | undefined): string {
  if (!cat) return "—";
  return discountCategoryLabels[cat as DiscountCategory] || cat;
}

export const projectionStatusLabels: Record<string, string> = {
  ABERTA: "Aberta",
  GANHO: "Ganho",
  PERDIDO: "Perdido",
};

export function labelProjectionStatus(status: string): string {
  return projectionStatusLabels[status] || status;
}

export const settlementOutcomeLabels: Record<string, string> = {
  ATINGIDA: "Atingida",
  NAO_ATINGIDA: "Não atingida",
};

export function labelSettlementOutcome(outcome: string | null | undefined): string {
  if (!outcome) return "Pendente";
  return settlementOutcomeLabels[outcome] || outcome;
}

export const monthLabels = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthName(month: number): string {
  return monthLabels[month - 1] || String(month);
}
