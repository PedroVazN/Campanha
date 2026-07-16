"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserNavFlags } from "@/app/actions";
import { NAV_FLAG_KEYS, type NavFlags } from "@/lib/nav-flags";
import { FormSubmit } from "@/components/form-submit";

const LABELS: Record<(typeof NAV_FLAG_KEYS)[number], string> = {
  home: "Início",
  distribuidores: "Distribuidores",
  campanhas: "Campanhas",
  projecoes: "Projeções",
  extrato: "Extrato",
  alertas: "Alertas",
  verba: "Verba",
  descontos: "Descontos",
  produtos: "Produtos",
  usuarios: "Usuários",
  relatorios: "Relatórios",
  developer: "Developer",
};

export function UserNavFlagsForm({
  userId,
  userName,
  role,
  flags,
}: {
  userId: string;
  userName: string;
  role: string;
  flags: NavFlags;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lockDeveloper = role === "DEVELOPER";

  return (
    <form
      className="panel p-4 space-y-4"
      action={(fd) => {
        startTransition(async () => {
          await updateUserNavFlags(fd);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-display font-bold text-ink">{userName}</p>
          <p className="text-xs text-muted mt-0.5">{role}</p>
        </div>
        <FormSubmit
          label={pending ? "Salvando…" : "Salvar abas"}
          pendingLabel="Salvando…"
          variant="secondary"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {NAV_FLAG_KEYS.map((key) => {
          const locked = lockDeveloper && (key === "developer" || key === "home");
          return (
            <label
              key={key}
              className="flex items-center gap-2 rounded-[8px] border border-line bg-paper/60 px-2.5 py-2 text-sm cursor-pointer hover:border-accent/40"
            >
              <input
                type="checkbox"
                name={`flag_${key}`}
                value="true"
                defaultChecked={flags[key]}
                disabled={locked}
              />
              <span className={locked ? "text-muted" : ""}>{LABELS[key]}</span>
            </label>
          );
        })}
      </div>
      {lockDeveloper ? (
        <p className="text-xs text-muted">
          Início e Developer ficam sempre ativos para o perfil master.
        </p>
      ) : null}
    </form>
  );
}
