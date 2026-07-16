import Link from "next/link";
import { CampaignStatus } from "@/lib/types";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { getAlerts } from "@/lib/alerts";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { labelCampaignCategory } from "@/lib/labels";

export default async function VendedorHome() {
  const session = await requireRole(["VENDEDOR"]);
  const sellerId = session.user.id;

  const distributors = await prisma.distributor.findMany({
    where: { sellerId },
    include: { campaigns: true },
    orderBy: { name: "asc" },
  });

  const campaigns = await prisma.campaign.findMany({
    where: { distributor: { sellerId } },
    include: { distributor: true },
    orderBy: { endDate: "asc" },
  });

  const alerts = await getAlerts({ sellerId, includeProjectionReminder: true });
  const active = campaigns.filter((c) => c.status === CampaignStatus.ATIVA);
  const future = campaigns.filter((c) => c.status === CampaignStatus.AGENDADA);
  const ended = campaigns.filter((c) => c.status === CampaignStatus.ENCERRADA);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Olá, {session.user.name.split(" ")[0]}</h1>
          <p className="page-desc">Seus distribuidores, campanhas e projeções de faturamento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projecoes" className="btn-primary">
            Lançar projeção
          </Link>
          <Link href="/campanhas/nova" className="btn-secondary">
            Nova campanha
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Distribuidores" value={String(distributors.length)} />
        <KpiCard label="Ativas" value={String(active.length)} tone="fund" />
        <KpiCard label="Futuras" value={String(future.length)} tone="accent" />
        <KpiCard label="Encerradas" value={String(ended.length)} tone="spent" />
      </div>

      {alerts.length > 0 ? (
        <section className="panel p-4 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-display font-semibold">Alertas</h2>
            <Link href="/alertas" className="text-sm text-accent">
              Ver todos
            </Link>
          </div>
          {alerts.slice(0, 4).map((a) => (
            <Link
              key={a.id}
              href={a.href || "/alertas"}
              className="block rounded-lg border border-line px-3 py-2 hover:bg-paper transition-colors"
            >
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted">{a.detail}</p>
            </Link>
          ))}
        </section>
      ) : null}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display font-semibold">Distribuidores</h2>
          <Link href="/distribuidores" className="text-sm text-accent">
            Gerenciar
          </Link>
        </div>
        {distributors.length === 0 ? (
          <EmptyState
            title="Nenhum distribuidor ainda"
            description="Cadastre o primeiro distribuidor para começar a lançar campanhas."
            actionLabel="Cadastrar distribuidor"
            actionHref="/distribuidores"
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {distributors.map((d) => (
              <Link
                key={d.id}
                href={`/distribuidores/${d.id}`}
                className="panel p-4 hover:border-accent/40 transition-colors"
              >
                <p className="font-medium">{d.name}</p>
                <p className="font-tabular text-fund text-lg mt-2">{formatBRL(d.balance)}</p>
                <p className="text-xs text-muted mt-1">
                  {d.campaigns.filter((c) => c.status === CampaignStatus.ATIVA).length} campanhas
                  ativas
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="font-display font-semibold">Campanhas</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nenhuma campanha este mês — criar campanha"
              description="Cadastre Sell Out, Vendeu Ganhou ou uma campanha personalizada."
              actionLabel="Criar campanha"
              actionHref="/campanhas/nova"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Campanha</th>
                  <th className="px-4 py-3 font-medium">Distribuidor</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Valor apurado</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.distributor.name}</td>
                    <td className="px-4 py-3">{labelCampaignCategory(c.category)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 font-tabular">
                      {c.settledOutcome === "NAO_ATINGIDA" ? (
                        <span className="text-xs font-medium text-critical">Não atingida</span>
                      ) : c.settledValue != null ? (
                        formatBRL(c.settledValue)
                      ) : (
                        <span className="text-muted text-xs">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
