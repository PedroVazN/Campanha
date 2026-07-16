/** Domínio tipado (strings no Postgres; enums de domínio no TypeScript). */

export const Roles = ["VENDEDOR", "ADM", "GESTOR", "DEVELOPER"] as const;
export type Role = (typeof Roles)[number];

export const CampaignCategories = ["SELL_OUT", "VENDEU_GANHOU", "PERSONALIZADA"] as const;
export type CampaignCategory = (typeof CampaignCategories)[number];

export const CampaignStatuses = [
  "RASCUNHO",
  "AGENDADA",
  "ATIVA",
  "ENCERRADA",
  "CANCELADA",
] as const;
export type CampaignStatus = (typeof CampaignStatuses)[number];

export const LedgerTypes = ["CREDITO", "DEBITO"] as const;
export type LedgerType = (typeof LedgerTypes)[number];

export const DiscountCategories = [
  "SELL_IN",
  "SELL_OUT",
  "VENDEU_GANHOU",
  "CAMPANHA",
  "OUTROS",
] as const;
export type DiscountCategory = (typeof DiscountCategories)[number];

export const CampaignStatus = {
  RASCUNHO: "RASCUNHO",
  AGENDADA: "AGENDADA",
  ATIVA: "ATIVA",
  ENCERRADA: "ENCERRADA",
  CANCELADA: "CANCELADA",
} as const;

export const LedgerType = {
  CREDITO: "CREDITO",
  DEBITO: "DEBITO",
} as const;

export const DiscountCategory = {
  SELL_IN: "SELL_IN",
  SELL_OUT: "SELL_OUT",
  VENDEU_GANHOU: "VENDEU_GANHOU",
  CAMPANHA: "CAMPANHA",
  OUTROS: "OUTROS",
} as const;

export const Role = {
  VENDEDOR: "VENDEDOR",
  ADM: "ADM",
  GESTOR: "GESTOR",
  DEVELOPER: "DEVELOPER",
} as const;

export const ProjectionStatuses = ["ABERTA", "GANHO", "PERDIDO"] as const;
export type ProjectionStatus = (typeof ProjectionStatuses)[number];

export const ProjectionStatus = {
  ABERTA: "ABERTA",
  GANHO: "GANHO",
  PERDIDO: "PERDIDO",
} as const;

export const SettlementOutcomes = ["ATINGIDA", "NAO_ATINGIDA"] as const;
export type SettlementOutcome = (typeof SettlementOutcomes)[number];

export const SettlementOutcome = {
  ATINGIDA: "ATINGIDA",
  NAO_ATINGIDA: "NAO_ATINGIDA",
} as const;
