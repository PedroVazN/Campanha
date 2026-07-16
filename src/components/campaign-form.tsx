"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";

type Dist = { id: string; name: string };
type Prod = { id: string; name: string };

type Props = {
  distributors: Dist[];
  products: Prod[];
  defaultMonth: number;
  defaultYear: number;
};

export function CampaignForm({
  distributors,
  products,
  defaultMonth,
  defaultYear,
}: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<"SELL_OUT" | "VENDEU_GANHOU" | "PERSONALIZADA">(
    "SELL_OUT"
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const needsProducts = category !== "PERSONALIZADA";
  const selectedCount = Object.values(selected).filter(Boolean).length;

  function toggleProduct(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <form
      className="panel p-4 sm:p-6 space-y-4"
      action={(fd) => {
        setError("");
        startTransition(async () => {
          try {
            await createCampaign(fd);
            router.push("/campanhas");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível criar a campanha.");
          }
        });
      }}
    >
      <p className="rounded-lg bg-paper border border-line px-3 py-2 text-sm text-muted">
        Campanhas não têm valor no cadastro. Na apuração o ADM/Gestor informa o{" "}
        <strong className="text-ink">valor apurado</strong> ou marca como{" "}
        <strong className="text-ink">não atingida</strong>.
      </p>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Categoria</span>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="field"
        >
          <option value="SELL_OUT">Sell Out — incentivo por produto</option>
          <option value="VENDEU_GANHOU">Vendeu Ganhou — incentivo ao vendedor do distribuidor</option>
          <option value="PERSONALIZADA">Campanha Personalizada</option>
        </select>
      </label>

      <label className="block space-y-1.5">
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

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Nome da campanha</span>
        <input name="name" required className="field" />
      </label>

      {needsProducts ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Produtos
            <span className="ml-2 font-normal text-muted">
              — selecione os itens da campanha (sem valor)
            </span>
          </legend>
          {products.length === 0 ? (
            <p className="text-sm text-warn">
              Nenhum produto cadastrado. Peça ao ADM para cadastrar produtos antes.
            </p>
          ) : (
            <div className="rounded-[10px] border border-line overflow-hidden divide-y divide-line bg-surface">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3.5 py-3 text-sm cursor-pointer hover:bg-accent-soft/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    name="productIds"
                    value={p.id}
                    checked={!!selected[p.id]}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span className="font-medium">{p.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            {selectedCount === 0
              ? "Nenhum produto selecionado ainda."
              : `${selectedCount} produto(s) selecionado(s).`}
          </p>
        </fieldset>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Data inicial</span>
          <input name="startDate" type="date" className="field" />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Data final</span>
          <input name="endDate" type="date" className="field" />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Mês de referência</span>
          <input
            name="referenceMonth"
            type="number"
            min={1}
            max={12}
            defaultValue={defaultMonth}
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Ano</span>
          <input
            name="referenceYear"
            type="number"
            defaultValue={defaultYear}
            className="field"
          />
        </label>
      </div>

      {needsProducts ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Quantidade projetada (opcional)</span>
          <input name="projectedQty" className="field font-tabular" />
        </label>
      ) : null}

      {category === "PERSONALIZADA" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Descrição completa</span>
          <textarea name="description" rows={4} required className="field" />
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Observações</span>
        <textarea name="observations" rows={2} className="field" />
      </label>

      {error ? (
        <p className="rounded-lg bg-critical-soft text-critical text-sm px-3 py-2">{error}</p>
      ) : null}

      <FormSubmit
        label={pending ? "Criando…" : "Criar campanha"}
        pendingLabel="Criando…"
      />
    </form>
  );
}
