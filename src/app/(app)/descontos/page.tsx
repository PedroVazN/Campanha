import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { launchDiscount } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { formatBRL } from "@/lib/money";
import { ConfirmFinanceForm } from "@/components/confirm-finance-form";
import { DescontoBulkUpload } from "@/components/desconto-bulk-upload";
import { discountCategoryLabels } from "@/lib/labels";
import { DiscountCategory } from "@/lib/types";

export default async function DescontosPage() {
  await requireRole(["ADM", "GESTOR"]);
  const distributors = await prisma.distributor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, balance: true },
  });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Lançar desconto</h1>
        <p className="page-desc">
          Só a categoria <strong className="text-ink">Campanha</strong> desconta da verba.
          Sell In, Sell Out e Vendeu Ganhou apenas contabilizam nos relatórios.
        </p>
      </div>

      <DescontoBulkUpload
        distributors={distributors}
        defaultMonth={month}
        defaultYear={year}
      />

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Lançamento unitário</h2>
        <ConfirmFinanceForm
          action={launchDiscount}
          confirmMessage="Confirmar lançamento? Se a categoria for Campanha, a verba será reduzida. Sell In, Sell Out e Vendeu Ganhou só entram no relatório."
          successMessage="Lançamento registrado"
        >
          <div className="panel p-4 grid sm:grid-cols-2 gap-3">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Distribuidor</span>
              <select
                name="distributorId"
                required
                className="field"
              >
                <option value="">Selecione</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — disponível {formatBRL(d.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Valor</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="field font-tabular"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Data</span>
              <input
                name="date"
                type="date"
                required
                defaultValue={today}
                className="field"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Mês de referência</span>
              <input
                name="referenceMonth"
                type="number"
                min={1}
                max={12}
                required
                defaultValue={month}
                className="field"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Ano</span>
              <input
                name="referenceYear"
                type="number"
                required
                defaultValue={year}
                className="field"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Categoria</span>
              <select
                name="category"
                required
                className="field"
              >
                {Object.values(DiscountCategory).map((c) => (
                  <option key={c} value={c}>
                    {discountCategoryLabels[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Observação</span>
              <textarea
                name="observation"
                rows={2}
                className="field"
              />
            </label>
            <div>
              <FormSubmit label="Lançar desconto" pendingLabel="Lançando…" />
            </div>
          </div>
        </ConfirmFinanceForm>
      </section>
    </div>
  );
}
