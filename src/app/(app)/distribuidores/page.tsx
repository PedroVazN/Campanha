import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeeAllDistributors } from "@/lib/rbac";
import { formatBRL } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDistributor } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { FormSubmit } from "@/components/form-submit";

export default async function DistribuidoresPage() {
  const session = await requireSession();
  const all = canSeeAllDistributors(session.user.role);

  // Resolve ID atual do banco (sessão pode ter ficado com ID antigo)
  const me = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");

  const distributors = await prisma.distributor.findMany({
    where: all ? undefined : { sellerId: me.id },
    include: { seller: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const sellers = all
    ? await prisma.user.findMany({
        where: { role: "VENDEDOR" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Distribuidores</h1>
        <p className="page-desc">
          Cadastro simples — o histórico financeiro nasce com as movimentações.
        </p>
      </div>

      <form action={createDistributor} className="panel p-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Nome do distribuidor</span>
          <input
            name="name"
            required
            placeholder="Ex.: Distribuidora Norte Sul"
            className="field"
          />
        </label>
        {all ? (
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Vendedor responsável</span>
            <select name="sellerId" required className="field" disabled={sellers.length === 0}>
              <option value="">
                {sellers.length === 0 ? "Nenhum vendedor cadastrado" : "Selecione"}
              </option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {sellers.length === 0 ? (
              <p className="text-sm text-warn">
                Cadastre um usuário com perfil Vendedor em Usuários antes de criar o distribuidor.
              </p>
            ) : null}
          </label>
        ) : null}
        <FormSubmit
          label="Cadastrar"
          pendingLabel="Salvando…"
          disabled={all && sellers.length === 0}
        />
      </form>

      {distributors.length === 0 ? (
        <EmptyState
          title="Nenhum distribuidor cadastrado"
          description="Informe o nome acima para criar o primeiro."
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                {all ? <th className="px-4 py-3 font-medium">Vendedor</th> : null}
                <th className="px-4 py-3 font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.id} className="border-t border-line hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/distribuidores/${d.id}`} className="font-medium text-accent">
                      {d.name}
                    </Link>
                  </td>
                  {all ? <td className="px-4 py-3 text-muted">{d.seller.name}</td> : null}
                  <td className="px-4 py-3 font-tabular text-fund">{formatBRL(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
