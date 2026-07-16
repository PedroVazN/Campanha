"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha incorretos. Verifique e tente de novo.");
      return;
    }
    const callback = params.get("callbackUrl") || "/";
    router.push(callback);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="login-card w-full max-w-md rounded-[16px] bg-surface p-7 sm:p-9 space-y-6"
    >
      <div className="space-y-4">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] text-[11px] font-bold leading-tight text-center text-white"
          style={{
            background: "linear-gradient(145deg, #3b82f6, #1d4ed8)",
            boxShadow: "0 10px 24px rgb(37 99 235 / 40%)",
          }}
        >
          SGI
          <br />
          4.0
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent mb-2">
            Acesso seguro
          </p>
          <h1 className="font-display text-[1.85rem] font-bold tracking-tight text-ink leading-none">
            SGI 4.0
          </h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Verba, campanhas e projeção de faturamento em um só lugar.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-ink">E-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          autoComplete="username"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-ink">Senha</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pl-9"
            autoComplete="current-password"
          />
        </div>
      </label>

      {error ? (
        <p className="rounded-[10px] bg-critical-soft text-critical text-sm px-3 py-2.5" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-stage min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 14px, #fff 14px, #fff 15px)",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        <p className="font-display text-on-dark/70 text-sm tracking-[0.2em] uppercase">
          Sistema de gestão integrada
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
