import Link from "next/link";
import clsx from "clsx";
import { requireSession } from "@/lib/session";
import { getAlerts } from "@/lib/alerts";
import { EmptyState } from "@/components/empty-state";

export default async function AlertasPage() {
  const session = await requireSession();
  const alerts = await getAlerts(
    session.user.role === "VENDEDOR"
      ? { sellerId: session.user.id, includeProjectionReminder: true }
      : undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Alertas</h1>
        <p className="page-desc">
          Verba baixa, prazos e distribuidores sem campanha no mês.
        </p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="Nenhum alerta no momento"
          description="Quando houver verba baixa ou campanhas próximas do fim, eles aparecem aqui."
        />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href || "#"}
                className={clsx(
                  "panel block p-4 hover:border-accent/30 transition-colors",
                  a.severity === "critical" && "border-critical/30",
                  a.severity === "warn" && "border-warn/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted mt-1">{a.detail}</p>
                  </div>
                  <span
                    className={clsx(
                      "text-xs font-medium rounded-md px-2 py-0.5 shrink-0",
                      a.severity === "critical" && "bg-critical-soft text-critical",
                      a.severity === "warn" && "bg-warn-soft text-warn",
                      a.severity === "info" && "bg-accent-soft text-accent"
                    )}
                  >
                    {a.severity === "critical"
                      ? "Crítico"
                      : a.severity === "warn"
                        ? "Atenção"
                        : "Info"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
