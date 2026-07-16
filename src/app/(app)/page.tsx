import Link from "next/link";
import { format } from "date-fns";
import { CampaignStatus } from "@/lib/types";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { FormSubmit } from "@/components/form-submit";
import { labelCampaignCategory, monthName } from "@/lib/labels";

type Search = {
  month?: string;
  year?: string;
};

export default async function GestorDashboard({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireRole(["GESTOR", "ADM", "DEVELOPER"]);

  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [projections, distributors, monthCredits, monthDebits, settledCampaigns] =
    await Promise.all([
      prisma.billingProjection.findMany({
        where: { referenceMonth: month, referenceYear: year },
        select: { amount: true, status: true },
      }),
      prisma.distributor.findMany({
        include: {
          seller: { select: { name: true } },
          ledger: true,
          campaigns: {
            include: {
              products: { include: { product: { select: { name: true } } } },
            },
            orderBy: { endDate: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.ledgerEntry.findMany({
        where: {
          type: "CREDITO",
          date: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.ledgerEntry.findMany({
        where: {
          type: "DEBITO",
          referenceMonth: month,
          referenceYear: year,
        },
      }),
      prisma.campaign.findMany({
        where: {
          settledAt: { gte: monthStart, lte: monthEnd },
        },
        select: {
          id: true,
          distributorId: true,
          settledValue: true,
          settledOutcome: true,
        },
      }),
    ]);

  const abertas = projections.filter((p) => p.status === "ABERTA");
  const ganhos = projections.filter((p) => p.status === "GANHO");
  const perdidos = projections.filter((p) => p.status === "PERDIDO");

  const sumProj = (list: typeof projections) => list.reduce((s, p) => s + p.amount, 0);
  const totalPendente = sumProj(abertas);
  const totalGanho = sumProj(ganhos);
  const totalPerdido = sumProj(perdidos);
  const previsao = totalPendente + totalGanho;

  /** Relatório mensal por distribuidor */
  const reportRows = distributors.map((d) => {
    const verbaGeradaMes = monthCredits
      .filter((e) => e.distributorId === d.id)
      .reduce((s, e) => s + e.credit, 0);

    // Só Campanha reduz verba; demais débitos são só contábeis
    const valorDescontado = monthDebits
      .filter((e) => e.distributorId === d.id && e.discountCategory === "CAMPANHA")
      .reduce((s, e) => s + e.debit, 0);

    const campanhaApurada = settledCampaigns
      .filter(
        (c) =>
          c.distributorId === d.id &&
          c.settledOutcome !== "NAO_ATINGIDA" &&
          c.settledValue != null
      )
      .reduce((s, c) => s + (c.settledValue || 0), 0);

    const campanhasNaoAtingidas = settledCampaigns.filter(
      (c) => c.distributorId === d.id && c.settledOutcome === "NAO_ATINGIDA"
    ).length;

    return {
      id: d.id,
      name: d.name,
      seller: d.seller.name,
      verbaDisponivel: d.balance,
      verbaGeradaMes,
      campanhaApurada,
      campanhasNaoAtingidas,
      valorDescontado,
    };
  });

  const totVerbaDisponivel = reportRows.reduce((s, r) => s + r.verbaDisponivel, 0);
  const totVerbaGerada = reportRows.reduce((s, r) => s + r.verbaGeradaMes, 0);
  const totCampanhaApurada = reportRows.reduce((s, r) => s + r.campanhaApurada, 0);
  const totDescontado = reportRows.reduce((s, r) => s + r.valorDescontado, 0);

  const activeCampaignsByDist = distributors
    .map((d) => ({
      ...d,
      campaigns: d.campaigns.filter((c) => c.status === CampaignStatus.ATIVA),
    }))
    .filter((d) => d.campaigns.length > 0);

  const withoutActive = distributors.filter(
    (d) => !d.campaigns.some((c) => c.status === CampaignStatus.ATIVA)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Painel do gestor</h1>
          <p className="page-desc">
            Projeção, verba e campanhas — {monthName(month)}/{year}.
          </p>
        </div>
        <Link href="/projecoes" className="btn-secondary text-sm">
          Ver projeções
        </Link>
      </div>

      <form method="get" className="panel p-3.5 flex flex-wrap gap-3 items-end">
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
        <FormSubmit label="Filtrar mês" variant="secondary" />
      </form>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 pl-[calc(3px+0.75rem)]">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Projeção de valores
          </h2>
          <p className="text-xs text-muted uppercase tracking-[0.08em] font-semibold">
            {monthName(month)}/{year}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Previsão do mês"
            value={formatBRL(previsao)}
            hint="Pendente + ganho"
            tone="accent"
          />
          <KpiCard
            label="Pendente"
            value={formatBRL(totalPendente)}
            hint={`${abertas.length} projeção(ões)`}
            tone="default"
          />
          <KpiCard
            label="Ganho"
            value={formatBRL(totalGanho)}
            hint={`${ganhos.length} projeção(ões)`}
            tone="fund"
          />
          <KpiCard
            label="Perdido"
            value={formatBRL(totalPerdido)}
            hint={`${perdidos.length} projeção(ões)`}
            tone="critical"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 pl-[calc(3px+0.75rem)]">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Relatório por distribuidor
            </h2>
            <p className="text-sm text-muted mt-1">
              Verba disponível, campanha apurada (ADM) e desconto na verba (só categoria
              Campanha) — {monthName(month)}/{year}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Verba disponível"
            value={formatBRL(totVerbaDisponivel)}
            hint="Saldo atual total"
            tone="fund"
          />
          <KpiCard
            label="Verba gerada no mês"
            value={formatBRL(totVerbaGerada)}
            hint="Créditos do período"
            tone="accent"
          />
          <KpiCard
            label="Campanha apurada"
            value={formatBRL(totCampanhaApurada)}
            hint="Apuração ADM no mês"
            tone="default"
          />
          <KpiCard
            label="Valor descontado"
            value={formatBRL(totDescontado)}
            hint="Débitos do período"
            tone="spent"
          />
        </div>

        {reportRows.length === 0 ? (
          <EmptyState
            title="Nenhum distribuidor"
            description="Cadastre distribuidores para ver o relatório mensal."
            actionLabel="Distribuidores"
            actionHref="/distribuidores"
          />
        ) : (
          <div className="panel overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Distribuidor</th>
                    <th>Vendedor</th>
                    <th className="text-right">Verba disponível</th>
                    <th className="text-right">Verba gerada no mês</th>
                    <th className="text-right">Campanha apurada (ADM)</th>
                    <th className="text-right">Desconto na verba (Campanha)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          href={`/distribuidores/${r.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="text-muted">{r.seller}</td>
                      <td className="text-right font-tabular font-semibold text-fund">
                        {formatBRL(r.verbaDisponivel)}
                      </td>
                      <td className="text-right font-tabular text-accent">
                        {formatBRL(r.verbaGeradaMes)}
                      </td>
                      <td className="text-right font-tabular">
                        {r.campanhaApurada > 0 || r.campanhasNaoAtingidas > 0 ? (
                          <span className="font-semibold text-ink">
                            {formatBRL(r.campanhaApurada)}
                            {r.campanhasNaoAtingidas > 0 ? (
                              <span className="block text-[11px] font-medium text-critical">
                                {r.campanhasNaoAtingidas} não atingida(s)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted">{formatBRL(0)}</span>
                        )}
                      </td>
                      <td className="text-right font-tabular font-semibold text-spent">
                        {formatBRL(r.valorDescontado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-paper/80">
                    <td colSpan={2} className="px-4 py-3 font-display font-bold text-ink">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-bold text-fund">
                      {formatBRL(totVerbaDisponivel)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-bold text-accent">
                      {formatBRL(totVerbaGerada)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-bold text-ink">
                      {formatBRL(totCampanhaApurada)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular font-bold text-spent">
                      {formatBRL(totDescontado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 pl-[calc(3px+0.75rem)]">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Campanhas ativas por distribuidor
            </h2>
            <p className="text-sm text-muted mt-1">
              {activeCampaignsByDist.length} distribuidor(es) com campanha em andamento
            </p>
          </div>
          <Link href="/campanhas" className="text-sm font-semibold text-accent hover:underline">
            Todas as campanhas
          </Link>
        </div>

        {activeCampaignsByDist.length === 0 ? (
          <EmptyState
            title="Nenhuma campanha ativa"
            description="Quando houver campanhas ativas, elas aparecem agrupadas por distribuidor."
            actionLabel="Ver campanhas"
            actionHref="/campanhas"
          />
        ) : (
          <div className="space-y-4">
            {activeCampaignsByDist.map((d) => (
              <article key={d.id} className="panel overflow-hidden">
                <div className="px-4 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-[linear-gradient(180deg,#f4f8ff_0%,#e8eef8_100%)]">
                  <div>
                    <Link
                      href={`/distribuidores/${d.id}`}
                      className="font-display font-bold text-ink hover:text-accent transition-colors"
                    >
                      {d.name}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">
                      Vendedor: {d.seller.name} · {d.campaigns.length} campanha(s) ativa(s)
                    </p>
                  </div>
                  <p className="font-tabular text-sm font-semibold text-fund">
                    {formatBRL(d.balance)}
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {d.campaigns.map((c) => (
                    <li
                      key={c.id}
                      className="px-4 py-3.5 flex flex-wrap items-start justify-between gap-3 hover:bg-accent-soft/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-ink">{c.name}</p>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-muted mt-1">
                          {labelCampaignCategory(c.category)}
                          {c.products.length
                            ? ` · ${c.products.map((p) => p.product.name).join(", ")}`
                            : ""}
                        </p>
                        {c.startDate && c.endDate ? (
                          <p className="text-xs text-muted mt-1 font-tabular">
                            {format(c.startDate, "dd/MM/yy")} – {format(c.endDate, "dd/MM/yy")}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        {c.settledOutcome === "NAO_ATINGIDA" ? (
                          <span className="text-xs font-semibold text-critical">Não atingida</span>
                        ) : c.settledValue != null ? (
                          <span className="font-tabular text-sm font-semibold text-fund">
                            {formatBRL(c.settledValue)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Apuração pendente</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {withoutActive.length > 0 ? (
          <p className="text-sm text-muted pl-[calc(3px+0.75rem)]">
            Sem campanha ativa:{" "}
            {withoutActive.map((d, i) => (
              <span key={d.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/distribuidores/${d.id}`} className="text-accent hover:underline">
                  {d.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </section>
    </div>
  );
}
