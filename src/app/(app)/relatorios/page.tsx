import { DiscountCategory } from "@/lib/types";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { discountCategoryLabels, monthName } from "@/lib/labels";
import { ReportExports } from "@/components/report-exports";
import { FormSubmit } from "@/components/form-submit";

type Search = {
  distributorId?: string;
  sellerId?: string;
  month?: string;
  year?: string;
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole(["ADM", "GESTOR"]);
  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();

  const [distributors, sellers] = await Promise.all([
    prisma.distributor.findMany({
      include: { seller: true, ledger: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { role: "VENDEDOR" }, orderBy: { name: "asc" } }),
  ]);

  let filtered = distributors;
  if (sp.distributorId) filtered = filtered.filter((d) => d.id === sp.distributorId);
  if (sp.sellerId) filtered = filtered.filter((d) => d.sellerId === sp.sellerId);

  const rows = filtered.map((d) => {
    const monthEntries = d.ledger.filter(
      (e) =>
        (e.referenceMonth === month && e.referenceYear === year) ||
        (e.type === "CREDITO" &&
          e.date.getMonth() + 1 === month &&
          e.date.getFullYear() === year)
    );
    const credits = monthEntries
      .filter((e) => e.type === "CREDITO")
      .reduce((s, e) => s + e.credit, 0);
    const debits = d.ledger.filter(
      (e) => e.type === "DEBITO" && e.referenceMonth === month && e.referenceYear === year
    );
    const byCat: Record<string, number> = {};
    for (const c of Object.values(DiscountCategory)) byCat[c] = 0;
    for (const e of debits) {
      if (e.discountCategory) byCat[e.discountCategory] += e.debit;
    }
    const totalSpent = debits.reduce((s, e) => s + e.debit, 0);
    // approximate opening: current - credits_in_month + debits_in_month (simplified for demo)
    const opening = d.balance - credits + totalSpent;
    const closing = opening + credits - totalSpent;

    return {
      distributor: d.name,
      seller: d.seller.name,
      opening,
      credits,
      byCat,
      totalSpent,
      closing: d.balance,
      closingCalc: closing,
    };
  });

  const exportRows = rows.map((r) => ({
    Distribuidor: r.distributor,
    Vendedor: r.seller,
    "Saldo inicial": r.opening,
    Créditos: r.credits,
    "Sell In": r.byCat.SELL_IN,
    "Sell Out": r.byCat.SELL_OUT,
    "Vendeu Ganhou": r.byCat.VENDEU_GANHOU,
    Campanha: r.byCat.CAMPANHA,
    Outros: r.byCat.OUTROS,
    "Total gasto": r.totalSpent,
    "Saldo final": r.closing,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Relatório mensal</h1>
          <p className="page-desc">
            Consolidado de {monthName(month)}/{year} — exportável em Excel e PDF.
          </p>
        </div>
        <ReportExports
          filename={`vpc-relatorio-${month}-${year}`}
          title={`Relatório SGI — ${monthName(month)}/${year}`}
          rows={exportRows}
        />
      </div>

      <form method="get" className="panel p-3.5 flex flex-wrap gap-3 items-end">
        <label className="space-y-1 text-sm">
          <span className="text-muted">Distribuidor</span>
          <select
            name="distributorId"
            defaultValue={sp.distributorId || ""}
            className="field field-sm min-w-[160px]"
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
          <span className="text-muted">Vendedor</span>
          <select
            name="sellerId"
            defaultValue={sp.sellerId || ""}
            className="field field-sm min-w-[160px]"
          >
            <option value="">Todos</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Mês</span>
          <input
            name="month"
            type="number"
            min={1}
            max={12}
            defaultValue={month}
            className="field field-sm w-20"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Ano</span>
          <input
            name="year"
            type="number"
            defaultValue={year}
            className="field field-sm w-24"
          />
        </label>
        <FormSubmit label="Aplicar" variant="secondary" />
      </form>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-muted text-left">
              <tr>
                <th className="px-3 py-3 font-medium">Distribuidor</th>
                <th className="px-3 py-3 font-medium">Vendedor</th>
                <th className="px-3 py-3 font-medium text-right">Saldo inicial</th>
                <th className="px-3 py-3 font-medium text-right">Créditos</th>
                {Object.values(DiscountCategory).map((c) => (
                  <th key={c} className="px-3 py-3 font-medium text-right">
                    {discountCategoryLabels[c]}
                  </th>
                ))}
                <th className="px-3 py-3 font-medium text-right">Total gasto</th>
                <th className="px-3 py-3 font-medium text-right">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.distributor} className="border-t border-line">
                  <td className="px-3 py-3 font-medium whitespace-nowrap">{r.distributor}</td>
                  <td className="px-3 py-3 text-muted whitespace-nowrap">{r.seller}</td>
                  <td className="px-3 py-3 text-right font-tabular">{formatBRL(r.opening)}</td>
                  <td className="px-3 py-3 text-right font-tabular text-fund">
                    {formatBRL(r.credits)}
                  </td>
                  {Object.values(DiscountCategory).map((c) => (
                    <td key={c} className="px-3 py-3 text-right font-tabular">
                      {formatBRL(r.byCat[c] || 0)}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-tabular text-spent">
                    {formatBRL(r.totalSpent)}
                  </td>
                  <td className="px-3 py-3 text-right font-tabular font-medium text-fund">
                    {formatBRL(r.closing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
