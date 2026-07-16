import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { NAV_FLAG_KEYS, parseNavFlags } from "@/lib/nav-flags";
import { UserNavFlagsForm } from "@/components/user-nav-flags-form";
import { createUser } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";

export default async function DeveloperPage() {
  await requireRole(["DEVELOPER"]);

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      navFlags: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Developer</h1>
        <p className="page-desc">
          Perfil master: escolha quais abas cada usuário enxerga. Flags escondem a aba e bloqueiam a
          URL.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg">Novo usuário</h2>
        <form action={createUser} className="panel p-4 grid sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Nome</span>
            <input name="name" required className="field" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">E-mail</span>
            <input name="email" type="email" required className="field" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Senha</span>
            <input name="password" type="password" required minLength={6} className="field" />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Perfil</span>
            <select name="role" required className="field">
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADM">Administrador</option>
              <option value="GESTOR">Gestor</option>
              <option value="DEVELOPER">Developer</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <FormSubmit label="Cadastrar usuário" />
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display font-bold text-lg">Flags de abas por usuário</h2>
          <p className="text-xs text-muted">
            {NAV_FLAG_KEYS.length} abas · {users.length} usuários
          </p>
        </div>
        <div className="space-y-4">
          {users.map((u) => {
            const role = u.role as Role;
            const flags = parseNavFlags(u.navFlags, role);
            return (
              <UserNavFlagsForm
                key={u.id}
                userId={u.id}
                userName={`${u.name} · ${u.email}`}
                role={roleLabels[role]}
                flags={flags}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
