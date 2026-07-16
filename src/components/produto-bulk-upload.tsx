"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { createProductsBatch } from "@/app/actions";

type ParsedRow = {
  row: number;
  nameRaw: string;
  name?: string;
  errors: string[];
};

type Props = {
  existingNames: string[];
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function ProdutoBulkUpload({ existingNames }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [pending, startTransition] = useTransition();

  const existingSet = useMemo(
    () => new Set(existingNames.map((n) => normalizeName(n))),
    [existingNames]
  );

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);
  const canSubmit = rows.length > 0 && invalidRows.length === 0;

  function downloadTemplate() {
    const model = [
      { Produto: "Produto Exemplo 1" },
      { Produto: "Produto Exemplo 2" },
      { Produto: "" },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(model, { header: ["Produto"] });
    ws["!cols"] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");

    if (existingNames.length) {
      const wsExist = XLSX.utils.json_to_sheet(
        existingNames.map((name) => ({ "Ja cadastrado": name }))
      );
      wsExist["!cols"] = [{ wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsExist, "JaCadastrados");
    }

    XLSX.writeFile(wb, "modelo-cadastro-produtos.xlsx");
  }

  function validateSheet(data: Record<string, unknown>[], startRow = 2): ParsedRow[] {
    const seenInSheet = new Set<string>();

    return data.map((item, index) => {
      const row = startRow + index;
      const nameRaw = String(
        item.Produto ??
          item.produto ??
          item.PRODUTO ??
          item.Nome ??
          item.nome ??
          item.Name ??
          ""
      ).trim();

      const errors: string[] = [];
      let name: string | undefined;

      if (!nameRaw) {
        errors.push("Nome do produto obrigatório");
      } else if (nameRaw.length < 2) {
        errors.push("Nome deve ter ao menos 2 caracteres");
      } else {
        const key = normalizeName(nameRaw);
        if (existingSet.has(key)) {
          errors.push(`Produto "${nameRaw}" já está cadastrado no sistema`);
        } else if (seenInSheet.has(key)) {
          errors.push(`Produto "${nameRaw}" duplicado nesta planilha`);
        } else {
          seenInSheet.add(key);
          name = nameRaw;
        }
      }

      return { row, nameRaw, name, errors };
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
        wb.SheetNames.find((n) => /produt/i.test(n) && !/cadastrad/i.test(n)) ||
        wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      // ignora linhas totalmente vazias
      const filled = json.filter((item) =>
        Object.values(item).some((v) => String(v ?? "").trim() !== "")
      );

      if (!filled.length) {
        setError("A planilha está vazia. Use o modelo e preencha ao menos um produto.");
        return;
      }

      const first = filled[0];
      const hasHeaders =
        "Produto" in first ||
        "produto" in first ||
        "Nome" in first ||
        "nome" in first;
      if (!hasHeaders) {
        setError('Cabeçalho inválido. Use a coluna "Produto" (baixe o modelo).');
        return;
      }

      const validated = validateSheet(filled);
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

    const confirmed = window.confirm(
      `Confirmar cadastro de ${validRows.length} produto(s)?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const result = await createProductsBatch(
          validRows.map((r) => ({ name: r.name! }))
        );
        setOk(`${result.count} produto(s) cadastrado(s).`);
        setRows([]);
        setFileName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao cadastrar a planilha.");
      }
    });
  }

  return (
    <section className="panel p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-lg">Cadastro em lote (Excel)</h2>
        <p className="text-sm text-muted mt-1">
          Baixe o modelo, preencha a coluna Produto, anexe o arquivo e valide antes de
          enviar.
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
                <th className="px-3 py-2 font-medium">Produto</th>
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
                  <td className="px-3 py-2">{r.nameRaw || "—"}</td>
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
          className="btn-primary"
        >
          {pending
            ? "Cadastrando…"
            : canSubmit
              ? `Confirmar e cadastrar ${validRows.length} produto(s)`
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
