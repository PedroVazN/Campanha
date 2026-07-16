import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canCreateCampaign } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { CampaignForm } from "@/components/campaign-form";

export default async function NovaCampanhaPage() {
  const session = await requireSession();
  if (!canCreateCampaign(session.user.role)) redirect("/campanhas");

  const sellerFilter =
    session.user.role === "VENDEDOR" ? { sellerId: session.user.id } : undefined;

  const [distributors, products] = await Promise.all([
    prisma.distributor.findMany({
      where: sellerFilter,
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Nova campanha</h1>
        <p className="page-desc">
          Escolha o distribuidor e a categoria. O status segue as datas automaticamente.
        </p>
      </div>
      <CampaignForm
        distributors={distributors.map((d) => ({ id: d.id, name: d.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        defaultMonth={now.getMonth() + 1}
        defaultYear={now.getFullYear()}
      />
    </div>
  );
}
