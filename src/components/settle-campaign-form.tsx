"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleCampaign } from "@/app/actions";
import { formatBRL } from "@/lib/money";

export function SettleCampaignForm({
  campaignId,
  campaignName,
  currentValue,
  currentOutcome,
}: {
  campaignId: string;
  campaignName: string;
  currentValue?: number | null;
  currentOutcome?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<"ATINGIDA" | "NAO_ATINGIDA">(
    currentOutcome === "NAO_ATINGIDA" ? "NAO_ATINGIDA" : "ATINGIDA"
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary min-h-8 px-2.5 text-xs"
      >
        {currentValue != null || currentOutcome ? "Reapurar" : "Apurar"}
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 min-w-[220px]"
      action={(fd) => {
        setError("");
        const label =
          outcome === "NAO_ATINGIDA"
            ? `Marcar "${campaignName}" como campanha não atingida?`
            : `Confirmar apuração de "${campaignName}"? Na primeira apuração o valor será descontado da verba do distribuidor.`;
        if (!window.confirm(label)) return;

        startTransition(async () => {
          try {
            await settleCampaign(fd);
            setOpen(false);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha na apuração.");
          }
        });
      }}
    >
      <input type="hidden" name="id" value={campaignId} />
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-muted">Resultado</legend>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="settledOutcome"
            value="ATINGIDA"
            checked={outcome === "ATINGIDA"}
            onChange={() => setOutcome("ATINGIDA")}
          />
          Campanha atingida
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="settledOutcome"
            value="NAO_ATINGIDA"
            checked={outcome === "NAO_ATINGIDA"}
            onChange={() => setOutcome("NAO_ATINGIDA")}
          />
          Campanha não atingida
        </label>
      </fieldset>

      {outcome === "ATINGIDA" ? (
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Valor apurado</span>
          <input
            name="settledValue"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={
              currentOutcome === "ATINGIDA" && currentValue != null
                ? currentValue
                : undefined
            }
            className="field font-tabular text-sm py-1.5"
            placeholder="0,00"
          />
        </label>
      ) : (
        <input type="hidden" name="settledValue" value="0" />
      )}

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted">Observação</span>
        <input name="settledNote" className="field text-sm py-1.5" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-fund min-h-8 px-2.5 text-xs">
          {pending ? "Salvando…" : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="btn-secondary min-h-8 px-2.5 text-xs"
        >
          Cancelar
        </button>
      </div>
      {currentOutcome === "NAO_ATINGIDA" ? (
        <p className="text-[11px] text-muted">Atual: não atingida</p>
      ) : currentValue != null ? (
        <p className="text-[11px] text-muted">Atual: {formatBRL(currentValue)}</p>
      ) : null}
      {error ? <p className="text-xs text-critical">{error}</p> : null}
    </form>
  );
}
