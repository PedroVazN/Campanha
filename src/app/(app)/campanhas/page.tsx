import Link from "next/link";
import { format } from "date-fns";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canCreateCampaign, canManageFinance } from "@/lib/rbac";
import { formatBRL } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { labelCampaignCategory } from "@/lib/labels";
import { cancelCampaign } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { SettleCampaignForm } from "@/components/settle-campaign-form";

type Search = { status?: string; category?: string };

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const sellerFilter =
    session.user.role === "VENDEDOR" ? { sellerId: session.user.id } : undefined;
  const canSettle = canManageFinance(session.user.role);

  const campaigns = await prisma.campaign.findMany({
    where: {
      distributor: sellerFilter,
      status: sp.status ? (sp.status as never) : undefined,
      category: sp.category ? (sp.category as never) : undefined,
    },
    include: {
      distributor: true,
      products: { include: { product: true } },
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-desc">
            Sem valor no cadastro — na apuração o ADM/Gestor informa o valor ou marca como não atingida.
          </p>
        </div>
        {canCreateCampaign(session.user.role) ? (
          <Link href="/campanhas/nova" className="btn-primary">
            Nova campanha
          </Link>
        ) : null}
      </div>

      <form
        method="get"
        className="panel p-3.5 flex flex-wrap gap-3 items-end sticky top-0 z-10 bg-surface/95 backdrop-blur"
      >
        <label className="space-y-1 text-sm">
          <span className="text-muted">Status</span>
          <select name="status" defaultValue={sp.status || ""} className="field field-sm min-w-[140px]">
            <option value="">Todos</option>
            <option value="ATIVA">Ativa</option>
            <option value="AGENDADA">Agendada</option>
            <option value="ENCERRADA">Encerrada</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Categoria</span>
          <select name="category" defaultValue={sp.category || ""} className="field field-sm min-w-[160px]">
            <option value="">Todas</option>
            <option value="SELL_OUT">Sell Out</option>
            <option value="VENDEU_GANHOU">Vendeu Ganhou</option>
            <option value="PERSONALIZADA">Personalizada</option>
          </select>
        </label>
        <FormSubmit label="Filtrar" variant="secondary" />
      </form>

      {campaigns.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha encontrada"
          description="Ajuste os filtros ou crie uma nova campanha."
          actionLabel="Criar campanha"
          actionHref="/campanhas/nova"
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Distribuidor</th>
                  <th>Categoria</th>
                  <th>Período</th>
                  <th>Valor apurado</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.name}</p>
                      {c.products.length ? (
                        <p className="text-xs text-muted">
                          {c.products.map((p) => p.product.name).join(", ")}
                        </p>
                      ) : null}
                      {c.settledNote ? (
                        <p className="text-xs text-muted mt-0.5">{c.settledNote}</p>
                      ) : null}
                    </td>
                    <td>
                      <Link href={`/distribuidores/${c.distributorId}`} className="text-accent">
                        {c.distributor.name}
                      </Link>
                    </td>
                    <td>{labelCampaignCategory(c.category)}</td>
                    <td className="text-muted whitespace-nowrap">
                      {c.startDate && c.endDate
                        ? `${format(c.startDate, "dd/MM/yy")} – ${format(c.endDate, "dd/MM/yy")}`
                        : "—"}
                    </td>
                    <td className="font-tabular">
                      {c.settledOutcome === "NAO_ATINGIDA" ? (
                        <span className="text-xs font-medium text-critical">Não atingida</span>
                      ) : c.settledValue != null ? (
                        <span className="text-fund font-medium">
                          {formatBRL(c.settledValue)}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Pendente</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div className="flex flex-col gap-2 items-start">
                        {canSettle && c.status !== "CANCELADA" ? (
                          <SettleCampaignForm
                            campaignId={c.id}
                            campaignName={c.name}
                            currentValue={c.settledValue}
                            currentOutcome={c.settledOutcome}
                          />
                        ) : null}
                        {c.status !== "CANCELADA" ? (
                          <form action={cancelCampaign}>
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              type="submit"
                              className="text-xs text-critical hover:underline cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : null}
                      </div>
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
