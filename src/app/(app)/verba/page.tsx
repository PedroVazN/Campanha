import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { launchVerba } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { formatBRL } from "@/lib/money";
import { ConfirmFinanceForm } from "@/components/confirm-finance-form";
import { VerbaBulkUpload } from "@/components/verba-bulk-upload";

export default async function VerbaPage() {
  await requireRole(["ADM", "GESTOR"]);
  const distributors = await prisma.distributor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, balance: true },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Lançar verba</h1>
        <p className="page-desc">
          Créditos ficam registrados no extrato e nunca são apagados. Use o formulário unitário
          ou a planilha para vários lançamentos.
        </p>
      </div>

      <VerbaBulkUpload distributors={distributors} />

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Lançamento unitário</h2>
        <ConfirmFinanceForm
          action={launchVerba}
          confirmMessage="Confirmar crédito de verba? Esta movimentação é permanente."
          successMessage="Verba lançada"
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
                    {d.name} — saldo {formatBRL(d.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Valor da verba</span>
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
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Observação</span>
              <textarea
                name="observation"
                rows={2}
                className="field"
              />
            </label>
            <div>
              <FormSubmit label="Lançar verba" pendingLabel="Lançando…" />
            </div>
          </div>
        </ConfirmFinanceForm>
      </section>
    </div>
  );
}
