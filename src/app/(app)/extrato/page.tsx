import { format } from "date-fns";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { labelDiscountCategory } from "@/lib/labels";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";

type Search = {
  distributorId?: string;
  month?: string;
  year?: string;
  type?: string;
};

export default async function ExtratoPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const sellerOnly = session.user.role === "VENDEDOR";

  const distributors = await prisma.distributor.findMany({
    where: sellerOnly ? { sellerId: session.user.id } : undefined,
    orderBy: { name: "asc" },
  });

  const distIds = distributors.map((d) => d.id);
  const now = new Date();

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      distributorId: sp.distributorId
        ? sp.distributorId
        : { in: distIds.length ? distIds : ["__none__"] },
      type: sp.type ? (sp.type as never) : undefined,
      referenceMonth: sp.month ? Number(sp.month) : undefined,
      referenceYear: sp.year ? Number(sp.year) : undefined,
    },
    include: { distributor: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Extrato financeiro</h1>
        <p className="page-desc">
          Histórico imutável — Data, Tipo, Categoria, Descrição, Crédito, Débito, Saldo.
        </p>
      </div>

      <form method="get" className="panel p-3.5 flex flex-wrap gap-3 items-end sticky top-0 z-10 bg-surface/95 backdrop-blur">
        <label className="space-y-1 text-sm">
          <span className="text-muted">Distribuidor</span>
          <select
            name="distributorId"
            defaultValue={sp.distributorId || ""}
            className="field field-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Tipo</span>
          <select
            name="type"
            defaultValue={sp.type || ""}
            className="field field-sm min-w-[130px]"
          >
            <option value="">Todos</option>
            <option value="CREDITO">Crédito</option>
            <option value="DEBITO">Débito</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Mês ref.</span>
          <input
            name="month"
            type="number"
            min={1}
            max={12}
            placeholder={String(now.getMonth() + 1)}
            defaultValue={sp.month || ""}
            className="field field-sm w-20"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Ano</span>
          <input
            name="year"
            type="number"
            placeholder={String(now.getFullYear())}
            defaultValue={sp.year || ""}
            className="field field-sm w-24"
          />
        </label>
        <FormSubmit label="Filtrar" variant="secondary" />
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação neste filtro"
          description="Lance verba ou desconto para gerar o extrato."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Distribuidor</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium text-right">Crédito</th>
                  <th className="px-4 py-3 font-medium text-right">Débito</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(e.date, "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">{e.distributor.name}</td>
                    <td className="px-4 py-3">
                      {e.type === "CREDITO" ? "Crédito" : "Débito"}
                    </td>
                    <td className="px-4 py-3">
                      {e.discountCategory
                        ? labelDiscountCategory(e.discountCategory)
                        : e.type === "CREDITO"
                          ? "Verba"
                          : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p>{e.description}</p>
                      {e.observation ? (
                        <p className="text-xs text-muted">{e.observation}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-fund">
                      {e.credit ? formatBRL(e.credit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-spent">
                      {e.debit ? formatBRL(e.debit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-medium">
                      {formatBRL(e.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
