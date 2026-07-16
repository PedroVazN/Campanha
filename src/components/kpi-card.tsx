import clsx from "clsx";

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "fund" | "warn" | "spent" | "accent" | "critical";
};

export function KpiCard({ label, value, hint, tone = "default" }: Props) {
  const toneClass = {
    default: "text-ink",
    fund: "text-fund",
    warn: "text-warn",
    spent: "text-spent",
    accent: "text-accent",
    critical: "text-critical",
  }[tone];

  const barClass = {
    default: "bg-secondary",
    fund: "bg-fund",
    warn: "bg-warn",
    spent: "bg-spent",
    accent: "bg-accent",
    critical: "bg-critical",
  }[tone];

  return (
    <div className="panel kpi relative overflow-hidden p-4 sm:p-5">
      <span
        className={clsx("absolute left-0 top-3 bottom-3 w-[3px] rounded-r-sm", barClass)}
        aria-hidden
      />
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted font-semibold mb-2.5 pl-3">
        {label}
      </p>
      <p
        className={clsx(
          "font-tabular text-[1.55rem] sm:text-[1.75rem] leading-none font-semibold pl-3 tracking-tight",
          toneClass
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted mt-2.5 pl-3">{hint}</p> : null}
    </div>
  );
}
