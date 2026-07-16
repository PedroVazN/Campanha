import { format } from "date-fns";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeeAllDistributors } from "@/lib/rbac";
import { formatBRL } from "@/lib/money";
import { monthName } from "@/lib/labels";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/empty-state";
import { ProjectionStatusBadge } from "@/components/projection-status-badge";
import {
  ProjectionCreateForm,
  ProjectionResolveButtons,
} from "@/components/projection-forms";
import { FormSubmit } from "@/components/form-submit";

type Search = {
  month?: string;
  year?: string;
  status?: string;
  sellerId?: string;
};

export default async function ProjecoesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();
  const isManager = canSeeAllDistributors(session.user.role);
  const canWin =
    session.user.role === "GESTOR" ||
    session.user.role === "ADM" ||
    session.user.role === "DEVELOPER";

  const distributors = await prisma.distributor.findMany({
    where: isManager ? undefined : { sellerId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const sellers = isManager
    ? await prisma.user.findMany({
        where: { role: "VENDEDOR" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const projections = await prisma.billingProjection.findMany({
    where: {
      referenceMonth: month,
      referenceYear: year,
      sellerId: isManager
        ? sp.sellerId || undefined
        : session.user.id,
      status: sp.status || undefined,
    },
    include: {
      distributor: true,
      seller: { select: { name: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const abertas = projections.filter((p) => p.status === "ABERTA");
  const ganhos = projections.filter((p) => p.status === "GANHO");
  const perdidos = projections.filter((p) => p.status === "PERDIDO");

  const sum = (list: typeof projections) =>
    list.reduce((s, p) => s + p.amount, 0);

  const totalAberto = sum(abertas);
  const totalGanho = sum(ganhos);
  const totalPerdido = sum(perdidos);
  const previsaoMes = totalAberto + totalGanho;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Projeção de faturamento</h1>
        <p className="page-desc">
          {session.user.role === "VENDEDOR"
            ? `Você lança a projeção de pedidos. Pode marcar como perdido; o gestor confirma o ganho. Lembrete: seg e qua às 9h.`
            : `Vendedor e gestor lançam projeções em ${monthName(month)}/${year}. Gestor/ADM marcam ganho ou perdido.`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Previsão do mês"
          value={formatBRL(previsaoMes)}
          hint="Abertas + ganhos"
          tone="accent"
        />
        <KpiCard label="Em aberto" value={formatBRL(totalAberto)} tone="default" />
        <KpiCard label="Ganho" value={formatBRL(totalGanho)} tone="fund" />
        <KpiCard label="Perdido" value={formatBRL(totalPerdido)} tone="critical" />
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
        <label className="space-y-1 text-sm">
          <span className="text-muted">Status</span>
          <select name="status" defaultValue={sp.status || ""} className="field field-sm min-w-[140px]">
            <option value="">Todos</option>
            <option value="ABERTA">Aberta</option>
            <option value="GANHO">Ganho</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </label>
        {isManager ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted">Vendedor</span>
            <select name="sellerId" defaultValue={sp.sellerId || ""} className="field field-sm min-w-[160px]">
              <option value="">Todos</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <FormSubmit label="Filtrar" variant="secondary" />
      </form>

      {(session.user.role === "VENDEDOR" ||
        session.user.role === "GESTOR" ||
        session.user.role === "DEVELOPER") &&
      distributors.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-lg">Lançar projeção</h2>
          <p className="text-sm text-muted">
            Informe o pedido previsto para faturamento.
            {session.user.role === "VENDEDOR"
              ? " O gestor verá na visão do mês."
              : " A projeção fica vinculada ao vendedor do distribuidor."}
          </p>
          <ProjectionCreateForm
            distributors={distributors}
            defaultMonth={month}
            defaultYear={year}
          />
        </section>
      ) : null}

      {projections.length === 0 ? (
        <EmptyState
          title="Nenhuma projeção neste filtro"
          description={
            session.user.role === "VENDEDOR" ||
            session.user.role === "GESTOR" ||
            session.user.role === "DEVELOPER"
              ? "Lance uma projeção de pedido para o mês selecionado."
              : "Aguardando lançamentos de projeção neste mês."
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido / descrição</th>
                  <th>Distribuidor</th>
                  {isManager ? <th>Vendedor</th> : null}
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                  <th>Lançada em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.description}</p>
                      {p.resolveNote ? (
                        <p className="text-xs text-muted mt-0.5">{p.resolveNote}</p>
                      ) : null}
                      {p.resolvedBy ? (
                        <p className="text-xs text-muted">
                          Resolvido por {p.resolvedBy.name}
                          {p.resolvedAt
                            ? ` em ${format(p.resolvedAt, "dd/MM/yyyy")}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td>{p.distributor.name}</td>
                    {isManager ? <td className="text-muted">{p.seller.name}</td> : null}
                    <td className="text-right font-tabular font-medium">
                      {formatBRL(p.amount)}
                    </td>
                    <td>
                      <ProjectionStatusBadge status={p.status} />
                    </td>
                    <td className="text-muted whitespace-nowrap">
                      {format(p.createdAt, "dd/MM/yyyy")}
                    </td>
                    <td>
                      {p.status === "ABERTA" ? (
                        <ProjectionResolveButtons
                          id={p.id}
                          amount={p.amount}
                          canWin={canWin}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
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
