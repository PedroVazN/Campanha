"use client";

import { useState, useTransition } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  successMessage: string;
  children: React.ReactNode;
};

export function ConfirmFinanceForm({
  action,
  confirmMessage,
  successMessage,
  children,
}: Props) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setError("");
        setOk("");
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            await action(fd);
            setOk(successMessage);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível concluir o lançamento.");
          }
        });
      }}
      className="space-y-3"
    >
      {children}
      {pending ? <p className="text-sm text-muted">Processando…</p> : null}
      {error ? (
        <p className="rounded-lg bg-critical-soft text-critical text-sm px-3 py-2">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-fund-soft text-fund text-sm px-3 py-2">{ok}</p>
      ) : null}
    </form>
  );
}
