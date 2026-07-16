"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { launchVerbaBatch } from "@/app/actions";
import { formatBRL } from "@/lib/money";

type Distributor = { id: string; name: string; balance: number };

type ParsedRow = {
  row: number;
  distributorRaw: string;
  amountRaw: string | number;
  descriptionRaw: string;
  distributorId?: string;
  distributorName?: string;
  amount?: number;
  description?: string;
  errors: string[];
};

type Props = {
  distributors: Distributor[];
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).trim().replace(/\s/g, "").replace(/R\$/gi, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // formato BR: 1.000,50
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function VerbaBulkUpload({ distributors }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, startTransition] = useTransition();

  const byName = useMemo(() => {
    const map = new Map<string, Distributor>();
    for (const d of distributors) {
      map.set(normalizeName(d.name), d);
    }
    return map;
  }, [distributors]);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const canSubmit = rows.length > 0 && invalidRows.length === 0;

  function downloadTemplate() {
    const model = [
      {
        Distribuidor: distributors[0]?.name || "Nome do distribuidor exatamente como no sistema",
        Valor: 1000,
        Descricao: "Ex.: Verba promocional março",
      },
      {
        Distribuidor: distributors[1]?.name || "",
        Valor: 2500.5,
        Descricao: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const wsModel = XLSX.utils.json_to_sheet(model, {
      header: ["Distribuidor", "Valor", "Descricao"],
    });
    wsModel["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsModel, "Lancamentos");

    const wsDist = XLSX.utils.json_to_sheet(
      distributors.map((d) => ({
        Distribuidor: d.name,
        "Saldo atual": d.balance,
      }))
    );
    wsDist["!cols"] = [{ wch: 36 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsDist, "Distribuidores");

    XLSX.writeFile(wb, "modelo-lancamento-verba.xlsx");
  }

  function validateSheet(data: Record<string, unknown>[], startRow = 2): ParsedRow[] {
    return data.map((item, index) => {
      const row = startRow + index;
      const distributorRaw = String(
        item.Distribuidor ?? item.distribuidor ?? item.DISTRIBUIDOR ?? ""
      ).trim();
      const amountRaw = (item.Valor ?? item.valor ?? item.VALOR ?? "") as string | number;
      const descriptionRaw = String(
        item.Descricao ??
          item.Descrição ??
          item.descricao ??
          item.DESCRICAO ??
          item.Observacao ??
          item.Observação ??
          ""
      ).trim();

      const errors: string[] = [];
      let distributorId: string | undefined;
      let distributorName: string | undefined;
      let amount: number | undefined;

      if (!distributorRaw) {
        errors.push("Distribuidor obrigatório");
      } else {
        const found = byName.get(normalizeName(distributorRaw));
        if (!found) {
          errors.push(`Distribuidor "${distributorRaw}" não encontrado no sistema`);
        } else {
          distributorId = found.id;
          distributorName = found.name;
        }
      }

      const parsedAmount = parseAmount(amountRaw);
      if (parsedAmount == null) {
        errors.push("Valor inválido ou vazio");
      } else if (parsedAmount <= 0) {
        errors.push("Valor deve ser maior que zero");
      } else {
        amount = Math.round((parsedAmount + Number.EPSILON) * 100) / 100;
      }

      if (!descriptionRaw) {
        errors.push("Descrição obrigatória");
      }

      return {
        row,
        distributorRaw,
        amountRaw,
        descriptionRaw,
        distributorId,
        distributorName,
        amount,
        description: descriptionRaw || undefined,
        errors,
      };
    });
  }

  async function onFileChange(file: File | null) {
    setError("");
    setOk("");
    setRows([]);
    setFileName("");
    if (!file) return;

    const okExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!okExt) {
      setError("Envie um arquivo Excel (.xlsx ou .xls) ou CSV.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName =
        wb.SheetNames.find((n) => /lanc/i.test(n)) ||
        wb.SheetNames.find((n) => !/distrib/i.test(n)) ||
        wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      if (!json.length) {
        setError("A planilha está vazia. Use o modelo e preencha ao menos uma linha.");
        return;
      }

      const first = json[0];
      const hasHeaders =
        "Distribuidor" in first ||
        "distribuidor" in first ||
        "Valor" in first ||
        "valor" in first;
      if (!hasHeaders) {
        setError(
          'Cabeçalhos inválidos. Use as colunas: Distribuidor, Valor e Descricao (baixe o modelo).'
        );
        return;
      }

      const validated = validateSheet(json);
      setRows(validated);
      setFileName(file.name);

      if (validated.every((r) => r.errors.length > 0)) {
        setError("Nenhuma linha válida. Corrija a planilha e anexe de novo.");
      }
    } catch {
      setError("Não foi possível ler o arquivo. Verifique se é um Excel válido.");
    }
  }

  function submitBatch() {
    setError("");
    setOk("");
    if (!canSubmit) {
      setError("Corrija os erros da planilha antes de enviar.");
      return;
    }

    const total = validRows.reduce((s, r) => s + (r.amount || 0), 0);
    const confirmed = window.confirm(
      `Confirmar ${validRows.length} crédito(s) de verba, totalizando ${formatBRL(total)}? Esta movimentação é permanente.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await launchVerbaBatch(
          validRows.map((r) => ({
            distributorId: r.distributorId!,
            amount: r.amount!,
            description: r.description!,
          }))
        );
        setOk(
          `${result.count} verba(s) lançada(s). Total: ${formatBRL(result.total)}.`
        );
        setRows([]);
        setFileName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao lançar a planilha.");
      }
    });
  }

  return (
    <section className="panel p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-lg">Lançamento em lote (Excel)</h2>
        <p className="text-sm text-muted mt-1">
          Baixe o modelo, preencha Distribuidor, Valor e Descrição, anexe o arquivo e valide
          antes de enviar.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="btn-secondary"
        >
          Baixar modelo Excel
        </button>
        <label className="btn-primary">
          Anexar planilha
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="sr-only"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {fileName ? (
        <p className="text-sm text-muted">
          Arquivo: <span className="text-ink font-medium">{fileName}</span> · {rows.length}{" "}
          linha(s) · {validRows.length} válida(s) · {invalidRows.length} com erro
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper text-muted text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Linha</th>
                <th className="px-3 py-2 font-medium">Distribuidor</th>
                <th className="px-3 py-2 font-medium text-right">Valor</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Validação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.row}
                  className={
                    r.errors.length
                      ? "border-t border-line bg-critical-soft/40"
                      : "border-t border-line"
                  }
                >
                  <td className="px-3 py-2 font-tabular">{r.row}</td>
                  <td className="px-3 py-2">
                    {r.distributorName || r.distributorRaw || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-tabular">
                    {r.amount != null ? formatBRL(r.amount) : String(r.amountRaw || "—")}
                  </td>
                  <td className="px-3 py-2 max-w-[240px] truncate">
                    {r.descriptionRaw || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.errors.length === 0 ? (
                      <span className="text-fund text-xs font-medium">OK</span>
                    ) : (
                      <ul className="text-critical text-xs space-y-0.5">
                        {r.errors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSubmit || pending}
          onClick={submitBatch}
          className="btn-fund"
        >
          {pending
            ? "Lançando…"
            : canSubmit
              ? `Confirmar e lançar ${validRows.length} verba(s)`
              : "Corrija os erros para enviar"}
        </button>
        {rows.length > 0 && !canSubmit ? (
          <p className="text-sm text-warn">
            Há {invalidRows.length} linha(s) inválida(s). O envio só libera com 100% válido.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-critical-soft text-critical text-sm px-3 py-2">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-fund-soft text-fund text-sm px-3 py-2">{ok}</p>
      ) : null}
    </section>
  );
}
