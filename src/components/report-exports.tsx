"use client";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Props = {
  filename: string;
  title: string;
  rows: Record<string, string | number>[];
};

export function ReportExports({ filename, title, rows }: Props) {
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    const keys = rows.length ? Object.keys(rows[0]) : [];
    autoTable(doc, {
      startY: 22,
      head: [keys],
      body: rows.map((r) => keys.map((k) => String(r[k] ?? ""))),
      styles: { fontSize: 8 },
    });
    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={exportExcel}
        className="btn-secondary"
      >
        Exportar Excel
      </button>
      <button
        type="button"
        onClick={exportPdf}
        className="btn-secondary"
      >
        Exportar PDF
      </button>
    </div>
  );
}
