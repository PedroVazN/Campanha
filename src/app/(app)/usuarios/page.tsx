import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/app/actions";
import { FormSubmit } from "@/components/form-submit";
import { roleLabels } from "@/lib/labels";
import type { Role } from "@/lib/types";

export default async function UsuariosPage() {
  await requireRole(["ADM", "GESTOR", "DEVELOPER"]);
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Usuários</h1>
        <p className="page-desc">Vendedor, Administrador, Gestor e Developer.</p>
      </div>

      <form action={createUser} className="panel p-4 grid sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Nome</span>
          <input name="name" required className="field" />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            required
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Perfil</span>
          <select name="role" required className="field">
            <option value="VENDEDOR">Vendedor</option>
            <option value="ADM">Administrador</option>
            <option value="GESTOR">Gestor</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <FormSubmit label="Cadastrar usuário" />
        </div>
      </form>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">{roleLabels[u.role as Role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
