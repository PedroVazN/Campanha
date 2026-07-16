"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBillingProjection, resolveBillingProjection } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { formatBRL } from "@/lib/money";

type Dist = { id: string; name: string };

export function ProjectionCreateForm({
  distributors,
  defaultMonth,
  defaultYear,
}: {
  distributors: Dist[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel p-4 grid sm:grid-cols-2 gap-3"
      action={(fd) => {
        setError("");
        setOk("");
        startTransition(async () => {
          try {
            await createBillingProjection(fd);
            setOk("Projeção lançada");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível lançar a projeção.");
          }
        });
      }}
    >
      <label className="space-y-1.5 sm:col-span-2">
        <span className="text-sm font-medium">Distribuidor</span>
        <select name="distributorId" required className="field">
          <option value="">Selecione</option>
          {distributors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-sm font-medium">Valor projetado</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="field font-tabular"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Mês</span>
          <input
            name="referenceMonth"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={defaultMonth}
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Ano</span>
          <input
            name="referenceYear"
            type="number"
            required
            defaultValue={defaultYear}
            className="field"
          />
        </label>
      </div>
      <label className="space-y-1.5 sm:col-span-2">
        <span className="text-sm font-medium">Descrição / pedido</span>
        <input
          name="description"
          required
          placeholder="Ex.: Pedido #4521 — mix Alpha/Beta"
          className="field"
        />
      </label>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <FormSubmit
          label={pending ? "Lançando…" : "Lançar projeção"}
          pendingLabel="Lançando…"
        />
        {error ? (
          <p className="text-sm text-critical" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="text-sm text-fund">Projeção lançada — o gestor já consegue ver.</p>
        ) : null}
      </div>
    </form>
  );
}

export function ProjectionResolveButtons({
  id,
  amount,
  canWin,
}: {
  id: string;
  amount: number;
  canWin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function resolve(status: "GANHO" | "PERDIDO") {
    setError("");
    const label =
      status === "GANHO"
        ? `Confirmar como GANHO ${formatBRL(amount)}?`
        : `Marcar como PERDIDO ${formatBRL(amount)}?`;
    if (!window.confirm(label)) return;

    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);

    startTransition(async () => {
      try {
        await resolveBillingProjection(fd);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao atualizar.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWin ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => resolve("GANHO")}
          className="btn-fund min-h-9 px-3 text-xs"
        >
          Ganho
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => resolve("PERDIDO")}
        className="btn-danger min-h-9 px-3 text-xs"
      >
        Perdido
      </button>
      {error ? <span className="text-xs text-critical">{error}</span> : null}
    </div>
  );
}
