import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createProduct } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { EmptyState } from "@/components/empty-state";
import { ProdutoBulkUpload } from "@/components/produto-bulk-upload";
import { format } from "date-fns";

export default async function ProdutosPage() {
  await requireRole(["ADM", "GESTOR"]);
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Produtos</h1>
        <p className="page-desc">
          Somente produtos cadastrados podem ser usados em campanhas. Cadastre um a um ou
          via planilha.
        </p>
      </div>

      <ProdutoBulkUpload existingNames={products.map((p) => p.name)} />

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg">Cadastro unitário</h2>
        <form
          action={createProduct}
          className="panel p-4 flex flex-col sm:flex-row gap-3 items-end"
        >
          <label className="flex-1 space-y-1.5 w-full">
            <span className="text-sm font-medium">Nome do produto</span>
            <input
              name="name"
              required
              className="field"
              placeholder="Ex.: Produto Alpha"
            />
          </label>
          <FormSubmit label="Cadastrar produto" />
        </form>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto cadastrado"
          description="Cadastre o primeiro produto para liberar campanhas Sell Out e Vendeu Ganhou."
        />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {format(p.createdAt, "dd/MM/yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
