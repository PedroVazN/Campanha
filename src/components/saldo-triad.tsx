import { formatBRL } from "@/lib/money";

type Props = {
  disponivel: number;
  projetado: number;
  realizado: number;
  title?: string;
};

/** Tríade de Saldo — proporção visual disponível / projetado / realizado. */
export function SaldoTriad({
  disponivel,
  projetado,
  realizado,
  title = "Posição da verba",
}: Props) {
  const total = Math.max(disponivel + projetado + realizado, 1);
  const wDisp = (Math.max(disponivel, 0) / total) * 100;
  const wProj = (Math.max(projetado, 0) / total) * 100;
  const wReal = (Math.max(realizado, 0) / total) * 100;

  return (
    <div className="panel panel-ledger p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-5 pl-2">
        <p className="font-display text-base font-bold tracking-tight text-ink">{title}</p>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted font-semibold">
          Tríade
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-5 pl-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-fund mb-1.5 font-semibold">
            Disponível
          </p>
          <p className="font-tabular text-lg sm:text-2xl font-semibold text-fund leading-tight">
            {formatBRL(disponivel)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-accent mb-1.5 font-semibold">
            Projetado
          </p>
          <p className="font-tabular text-lg sm:text-2xl font-semibold text-accent leading-tight">
            {formatBRL(projetado)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-spent mb-1.5 font-semibold">
            Realizado
          </p>
          <p className="font-tabular text-lg sm:text-2xl font-semibold text-spent leading-tight">
            {formatBRL(realizado)}
          </p>
        </div>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-md bg-paper ml-2"
        role="img"
        aria-label="Proporção disponível, projetado e realizado"
      >
        <span className="bg-fund transition-[width] duration-300" style={{ width: `${wDisp}%` }} />
        <span className="bg-accent transition-[width] duration-300" style={{ width: `${wProj}%` }} />
        <span className="bg-spent transition-[width] duration-300" style={{ width: `${wReal}%` }} />
      </div>
    </div>
  );
}
