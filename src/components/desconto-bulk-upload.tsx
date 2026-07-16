"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { launchDiscountBatch } from "@/app/actions";
import { formatBRL } from "@/lib/money";
import { discountCategoryLabels } from "@/lib/labels";
import { DiscountCategory, type DiscountCategory as DiscountCategoryType } from "@/lib/types";

type Distributor = { id: string; name: string; balance: number };

type ParsedRow = {
  row: number;
  distributorRaw: string;
  amountRaw: string | number;
  categoryRaw: string;
  descriptionRaw: string;
  monthRaw: string | number;
  yearRaw: string | number;
  distributorId?: string;
  distributorName?: string;
  amount?: number;
  category?: DiscountCategoryType;
  description?: string;
  referenceMonth?: number;
  referenceYear?: number;
  errors: string[];
};

type Props = {
  distributors: Distributor[];
  defaultMonth: number;
  defaultYear: number;
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
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function resolveCategory(raw: string): DiscountCategoryType | null {
  const t = raw.trim();
  if (!t) return null;
  const upper = t.toUpperCase().replace(/\s+/g, "_");
  if ((Object.values(DiscountCategory) as string[]).includes(upper)) {
    return upper as DiscountCategoryType;
  }
  const byLabel = Object.entries(discountCategoryLabels).find(
    ([, label]) => normalizeName(label) === normalizeName(t)
  );
  return byLabel ? (byLabel[0] as DiscountCategoryType) : null;
}

export function DescontoBulkUpload({
  distributors,
  defaultMonth,
  defaultYear,
}: Props) {
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
        Valor: 500,
        Categoria: "Sell Out",
        Descricao: "Ex.: SPIFF março",
        Mes: defaultMonth,
        Ano: defaultYear,
      },
      {
        Distribuidor: distributors[1]?.name || "",
        Valor: 1200.5,
        Categoria: "VENDEU_GANHOU",
        Descricao: "Incentivo equipe",
        Mes: defaultMonth,
        Ano: defaultYear,
      },
    ];

    const wb = XLSX.utils.book_new();
    const wsModel = XLSX.utils.json_to_sheet(model, {
      header: ["Distribuidor", "Valor", "Categoria", "Descricao", "Mes", "Ano"],
    });
    wsModel["!cols"] = [
      { wch: 36 },
      { wch: 12 },
      { wch: 16 },
      { wch: 36 },
      { wch: 8 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsModel, "Lancamentos");

    const wsDist = XLSX.utils.json_to_sheet(
      distributors.map((d) => ({
        Distribuidor: d.name,
        "Saldo disponivel": d.balance,
      }))
    );
    wsDist["!cols"] = [{ wch: 36 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsDist, "Distribuidores");

    const wsCat = XLSX.utils.json_to_sheet(
      Object.entries(discountCategoryLabels).map(([codigo, nome]) => ({
        Codigo: codigo,
        Nome: nome,
      }))
    );
    wsCat["!cols"] = [{ wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsCat, "Categorias");

    XLSX.writeFile(wb, "modelo-lancamento-desconto.xlsx");
  }

  function validateSheet(data: Record<string, unknown>[], startRow = 2): ParsedRow[] {
    const remaining = new Map(distributors.map((d) => [d.id, d.balance]));

    return data.map((item, index) => {
      const row = startRow + index;
      const distributorRaw = String(
        item.Distribuidor ?? item.distribuidor ?? item.DISTRIBUIDOR ?? ""
      ).trim();
      const amountRaw = (item.Valor ?? item.valor ?? item.VALOR ?? "") as string | number;
      const categoryRaw = String(
        item.Categoria ?? item.categoria ?? item.CATEGORIA ?? ""
      ).trim();
      const descriptionRaw = String(
        item.Descricao ??
          item.Descrição ??
          item.descricao ??
          item.Observacao ??
          item.Observação ??
          ""
      ).trim();
      const monthRaw = (item.Mes ?? item.Mês ?? item.mes ?? item.MES ?? "") as
        | string
        | number;
      const yearRaw = (item.Ano ?? item.ano ?? item.ANO ?? "") as string | number;

      const errors: string[] = [];
      let distributorId: string | undefined;
      let distributorName: string | undefined;
      let amount: number | undefined;
      let category: DiscountCategoryType | undefined;
      let referenceMonth = defaultMonth;
      let referenceYear = defaultYear;

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

      const resolved = resolveCategory(categoryRaw);
      if (!resolved) {
        errors.push(
          "Categoria inválida (use Sell In, Sell Out, Vendeu Ganhou, Campanha ou Outros)"
        );
      } else {
        category = resolved;
      }

      if (!descriptionRaw) {
        errors.push("Descrição obrigatória");
      }

      if (monthRaw !== "" && monthRaw != null) {
        const m = Number(monthRaw);
        if (!Number.isInteger(m) || m < 1 || m > 12) {
          errors.push("Mês deve ser entre 1 e 12");
        } else {
          referenceMonth = m;
        }
      }

      if (yearRaw !== "" && yearRaw != null) {
        const y = Number(yearRaw);
        if (!Number.isInteger(y) || y < 2000 || y > 2100) {
          errors.push("Ano inválido");
        } else {
          referenceYear = y;
        }
      }

      if (distributorId && amount != null && errors.length === 0) {
        const avail = remaining.get(distributorId) ?? 0;
        if (amount > avail) {
          errors.push(
            `Saldo insuficiente (disponível ${formatBRL(avail)} após linhas anteriores)`
          );
        } else {
          remaining.set(distributorId, Math.round((avail - amount) * 100) / 100);
        }
      }

      return {
        row,
        distributorRaw,
        amountRaw,
        categoryRaw,
        descriptionRaw,
        monthRaw,
        yearRaw,
        distributorId,
        distributorName,
        amount,
        category,
        description: descriptionRaw || undefined,
        referenceMonth,
        referenceYear,
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

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("Envie um arquivo Excel (.xlsx ou .xls) ou CSV.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName =
        wb.SheetNames.find((n) => /lanc/i.test(n)) ||
        wb.SheetNames.find((n) => !/distrib|categor/i.test(n)) ||
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
          "Cabeçalhos inválidos. Use: Distribuidor, Valor, Categoria, Descricao, Mes, Ano."
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
      `Confirmar ${validRows.length} desconto(s), totalizando ${formatBRL(total)}? O saldo será reduzido de forma permanente.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await launchDiscountBatch(
          validRows.map((r) => ({
            distributorId: r.distributorId!,
            amount: r.amount!,
            category: r.category!,
            description: r.description!,
            referenceMonth: r.referenceMonth!,
            referenceYear: r.referenceYear!,
          }))
        );
        setOk(
          `${result.count} desconto(s) lançado(s). Total: ${formatBRL(result.total)}.`
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
          Baixe o modelo, preencha Distribuidor, Valor, Categoria e Descrição (Mês/Ano
          opcionais), anexe e valide antes de enviar.
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
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Ref.</th>
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
                  <td className="px-3 py-2">
                    {r.category
                      ? discountCategoryLabels[r.category]
                      : r.categoryRaw || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate">
                    {r.descriptionRaw || "—"}
                  </td>
                  <td className="px-3 py-2 font-tabular whitespace-nowrap">
                    {r.referenceMonth}/{r.referenceYear}
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
          className="btn-danger"
        >
          {pending
            ? "Lançando…"
            : canSubmit
              ? `Confirmar e lançar ${validRows.length} desconto(s)`
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
