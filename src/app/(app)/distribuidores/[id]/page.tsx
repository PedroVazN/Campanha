import { notFound, redirect } from "next/navigation";
import { CampaignStatus } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeeAllDistributors } from "@/lib/rbac";
import { formatBRL } from "@/lib/money";
import { SaldoTriad } from "@/components/saldo-triad";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import {
  labelCampaignCategory,
  labelDiscountCategory,
  monthName,
} from "@/lib/labels";
import { DistributorCharts } from "@/components/distributor-charts";

type Props = { params: Promise<{ id: string }> };

export default async function DistributorDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireSession();

  const dist = await prisma.distributor.findUnique({
    where: { id },
    include: {
      seller: true,
      campaigns: {
        include: { products: { include: { product: true } } },
        orderBy: { startDate: "desc" },
      },
      ledger: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });

  if (!dist) notFound();
  if (!canSeeAllDistributors(session.user.role) && dist.sellerId !== session.user.id) {
    redirect("/distribuidores");
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const credits = dist.ledger.filter((e) => e.type === "CREDITO");
  const debits = dist.ledger.filter((e) => e.type === "DEBITO");
  const totalCredit = credits.reduce((s, e) => s + e.credit, 0);
  const totalDebit = debits.reduce((s, e) => s + e.debit, 0);
  const monthSpend = debits
    .filter((e) => e.referenceMonth === month && e.referenceYear === year)
    .reduce((s, e) => s + e.debit, 0);
  const yearSpend = debits
    .filter((e) => e.referenceYear === year)
    .reduce((s, e) => s + e.debit, 0);
  const settledTotal = dist.campaigns
    .filter((c) => c.settledValue != null)
    .reduce((s, c) => s + (c.settledValue || 0), 0);
  const openBilling = await prisma.billingProjection.aggregate({
    where: { distributorId: dist.id, status: "ABERTA" },
    _sum: { amount: true },
  });
  const projectedBilling = openBilling._sum.amount || 0;

  const active = dist.campaigns.filter((c) => c.status === CampaignStatus.ATIVA);
  const future = dist.campaigns.filter((c) => c.status === CampaignStatus.AGENDADA);
  const ended = dist.campaigns.filter(
    (c) => c.status === CampaignStatus.ENCERRADA || c.status === CampaignStatus.CANCELADA
  );

  // monthly balance evolution (simplified from ledger chronological)
  const chronological = [...dist.ledger].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
  );
  const byMonthSpend = new Map<string, number>();
  for (const e of debits) {
    if (!e.referenceMonth || !e.referenceYear) continue;
    const key = `${e.referenceYear}-${e.referenceMonth}`;
    byMonthSpend.set(key, (byMonthSpend.get(key) || 0) + e.debit);
  }
  const monthlySpend = Array.from(byMonthSpend.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const m = Number(key.split("-")[1]);
      return { label: `${monthName(m).slice(0, 3)}`, value };
    });

  const byCat = new Map<string, number>();
  for (const e of debits) {
    if (!e.discountCategory) continue;
    const label = labelDiscountCategory(e.discountCategory);
    byCat.set(label, (byCat.get(label) || 0) + e.debit);
  }
  const categoryData = Array.from(byCat.entries()).map(([name, value]) => ({ name, value }));

  const balanceSeries = chronological.slice(-12).map((e) => ({
    label: format(e.date, "dd/MM", { locale: ptBR }),
    value: e.balanceAfter,
  }));

  function CampaignGroup({
    title,
    items,
  }: {
    title: string;
    items: typeof active;
  }) {
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted">{title}</h3>
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-lg border border-line px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-muted mt-1">
                {labelCampaignCategory(c.category)}
                {c.products.length
                  ? ` · ${c.products.map((p) => p.product.name).join(", ")}`
                  : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="font-tabular">
                  {c.settledOutcome === "NAO_ATINGIDA"
                    ? "Campanha não atingida"
                    : c.settledValue != null
                      ? `${formatBRL(c.settledValue)} apurado`
                      : "Valor pendente de apuração"}
                </span>
                {c.startDate && c.endDate ? (
                  <span className="text-muted">
                    {format(c.startDate, "dd/MM/yy")} — {format(c.endDate, "dd/MM/yy")}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Distribuidor · {dist.seller.name}</p>
        <h1 className="page-title mt-1">{dist.name}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Saldo atual" value={formatBRL(dist.balance)} tone="fund" />
        <KpiCard label="Verba recebida" value={formatBRL(totalCredit)} />
        <KpiCard label="Total utilizado" value={formatBRL(totalDebit)} tone="spent" />
        <KpiCard
          label="Gasto no mês / ano"
          value={formatBRL(monthSpend)}
          hint={`Ano: ${formatBRL(yearSpend)}`}
          tone="warn"
        />
      </div>

      <SaldoTriad
        disponivel={dist.balance}
        projetado={projectedBilling}
        realizado={totalDebit}
        title="Tríade deste distribuidor"
      />

      <p className="text-sm text-muted">
        Campanhas apuradas:{" "}
        <span className="font-tabular text-ink">{formatBRL(settledTotal)}</span>
      </p>

      <DistributorCharts
        balanceSeries={balanceSeries}
        monthlySpend={monthlySpend}
        byCategory={categoryData}
        projected={projectedBilling}
        realized={totalDebit}
      />

      <section className="panel p-4 space-y-5">
        <h2 className="font-display font-semibold">Campanhas</h2>
        <CampaignGroup title="Ativas" items={active} />
        <CampaignGroup title="Futuras" items={future} />
        <CampaignGroup title="Encerradas" items={ended} />
        {!dist.campaigns.length ? (
          <p className="text-sm text-muted">Nenhuma campanha cadastrada para este distribuidor.</p>
        ) : null}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display font-semibold">Créditos</h2>
          </div>
          <ul className="divide-y divide-line">
            {credits.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted">Nenhum crédito lançado.</li>
            ) : (
              credits.map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm flex justify-between gap-3">
                  <div>
                    <p className="font-medium">{e.description}</p>
                    <p className="text-xs text-muted">
                      {format(e.date, "dd/MM/yyyy")}
                      {e.observation ? ` · ${e.observation}` : ""}
                    </p>
                  </div>
                  <p className="font-tabular text-fund">{formatBRL(e.credit)}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-display font-semibold">Descontos</h2>
          </div>
          <ul className="divide-y divide-line">
            {debits.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted">Nenhum desconto lançado.</li>
            ) : (
              debits.map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {e.discountCategory
                        ? labelDiscountCategory(e.discountCategory)
                        : e.description}
                    </p>
                    <p className="text-xs text-muted">
                      {format(e.date, "dd/MM/yyyy")}
                      {e.observation ? ` · ${e.observation}` : ""}
                    </p>
                  </div>
                  <p className="font-tabular text-spent">{formatBRL(e.debit)}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
