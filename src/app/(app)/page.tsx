import Link from "next/link";
import { format } from "date-fns";
import { CampaignStatus } from "@/lib/types";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { labelCampaignCategory, monthName } from "@/lib/labels";

export default async function GestorDashboard() {
  await requireRole(["GESTOR", "ADM", "DEVELOPER"]);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [projections, distributors] = await Promise.all([
    prisma.billingProjection.findMany({
      where: { referenceMonth: month, referenceYear: year },
      select: { amount: true, status: true },
    }),
    prisma.distributor.findMany({
      include: {
        seller: { select: { name: true } },
        campaigns: {
          where: { status: CampaignStatus.ATIVA },
          include: {
            products: { include: { product: { select: { name: true } } } },
          },
          orderBy: { endDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const abertas = projections.filter((p) => p.status === "ABERTA");
  const ganhos = projections.filter((p) => p.status === "GANHO");
  const perdidos = projections.filter((p) => p.status === "PERDIDO");

  const sum = (list: typeof projections) => list.reduce((s, p) => s + p.amount, 0);
  const totalPendente = sum(abertas);
  const totalGanho = sum(ganhos);
  const totalPerdido = sum(perdidos);
  const previsao = totalPendente + totalGanho;

  const withActive = distributors.filter((d) => d.campaigns.length > 0);
  const withoutActive = distributors.filter((d) => d.campaigns.length === 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Painel do gestor</h1>
          <p className="page-desc">
            Projeção de faturamento e campanhas ativas — {monthName(month)}/{year}.
          </p>
        </div>
        <Link href="/projecoes" className="btn-secondary text-sm">
          Ver projeções
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 pl-[calc(3px+0.75rem)]">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">
            Projeção de valores
          </h2>
          <p className="text-xs text-muted uppercase tracking-[0.08em] font-semibold">
            Principal
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 pl-[calc(3px+0.75rem)]">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Campanhas ativas por distribuidor
            </h2>
            <p className="text-sm text-muted mt-1">
              {withActive.length} distribuidor(es) com campanha em andamento
            </p>
          </div>
          <Link href="/campanhas" className="text-sm font-semibold text-accent hover:underline">
            Todas as campanhas
          </Link>
        </div>

        {withActive.length === 0 ? (
          <EmptyState
            title="Nenhuma campanha ativa"
            description="Quando houver campanhas ativas, elas aparecem agrupadas por distribuidor."
            actionLabel="Ver campanhas"
            actionHref="/campanhas"
          />
        ) : (
          <div className="space-y-4">
            {withActive.map((d) => (
              <article key={d.id} className="panel overflow-hidden">
                <div className="px-4 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-[linear-gradient(180deg,#f7f8fa_0%,#eef1f5_100%)]">
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
