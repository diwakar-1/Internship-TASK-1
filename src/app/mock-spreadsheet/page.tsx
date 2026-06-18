"use client";
import { useEffect, useState, useMemo } from "react";
import { dataStore } from "@/lib/store";
import type { Form, FormResponse } from "@/types";
import { ArrowLeft, Save, FileText, ChevronDown, Download, Share2, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { formatDateTime, cn } from "@/lib/utils";

export default function MockSpreadsheetPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 });

  // Load forms and responses
  useEffect(() => {
    const allForms = dataStore.getForms();
    setForms(allForms);
    if (allForms.length > 0) {
      setSelectedFormId(allForms[0].id);
    }
  }, []);

  useEffect(() => {
    if (!selectedFormId) return;
    setResponses(dataStore.getResponses(selectedFormId));
    setActiveCell({ row: 0, col: 0 });
  }, [selectedFormId]);

  const selectedForm = useMemo(() => forms.find((f) => f.id === selectedFormId) ?? null, [forms, selectedFormId]);

  // Headers representation
  const headers = useMemo(() => {
    if (!selectedForm) return ["Timestamp"];
    return ["Timestamp", ...selectedForm.fields.map((f) => f.label)];
  }, [selectedForm]);

  // Rows representation
  const rows = useMemo(() => {
    if (responses.length === 0) {
      // Return a demo row if there are no responses yet
      if (!selectedForm) return [];
      const demoRow: Record<string, string> = {
        Timestamp: formatDateTime(Date.now()),
      };
      selectedForm.fields.forEach((f) => {
        demoRow[f.label] = `Sample ${f.label}`;
      });
      return [demoRow];
    }

    return responses.map((r) => {
      const row: Record<string, string> = {
        Timestamp: formatDateTime(r.submittedAt),
      };
      if (selectedForm) {
        selectedForm.fields.forEach((f) => {
          const val = r.data[f.label];
          if (f.type === "signature") {
            row[f.label] = val ? "[Signature]" : "";
          } else {
            row[f.label] = Array.isArray(val) ? val.join(", ") : val !== undefined ? String(val) : "";
          }
        });
      }
      return row;
    });
  }, [responses, selectedForm]);

  // Helper to convert index to spreadsheet column letter (A, B, C... Z, AA, AB...)
  const getColumnLabel = (index: number): string => {
    let label = "";
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  };

  const activeCellValue = useMemo(() => {
    if (!activeCell || rows.length === 0) return "";
    const rowData = rows[activeCell.row];
    if (!rowData) return "";
    const headerKey = headers[activeCell.col];
    return rowData[headerKey] ?? "";
  }, [activeCell, rows, headers]);

  return (
    <div className="min-h-screen bg-[#f9fbf9] flex flex-col text-slate-700 font-sans select-none">
      {/* GOOGLE SHEETS HEADER ROW */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Green Sheet Icon */}
          <Link href="/forms" className="hover:opacity-80 transition" title="Back to Dashboard">
            <div className="w-9 h-9 rounded-lg bg-[#0f9d58] flex items-center justify-center text-white shadow-sm">
              <FileText size={18} className="fill-white" />
            </div>
          </Link>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-[16px]">
                {selectedForm ? `${selectedForm.title} (Responses)` : "FormCraft Responses"}
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded px-1.5 py-0.2 uppercase">
                Mock Google Sheets
              </span>
            </div>
            {/* Fake Menu */}
            <div className="flex items-center gap-3.5 text-xs text-slate-500 font-medium mt-0.5">
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">File</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">Edit</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">View</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">Insert</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">Format</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">Data</span>
              <span className="hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition">Tools</span>
            </div>
          </div>
        </div>

        {/* Form Selection Controls */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider shrink-0">Select Form Data</label>
          <div className="relative">
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer appearance-none transition"
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          <Link href="/forms" className="bg-[#0f9d58] hover:bg-[#0b8043] text-white font-bold text-xs px-5 py-2 rounded-full shadow-sm transition flex items-center gap-1.5">
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
        </div>
      </header>

      {/* GOOGLE SHEETS TOOLBAR */}
      <div className="bg-[#f0f4f9] border-b border-slate-200 py-1.5 px-4 flex items-center gap-4 text-slate-600 overflow-x-auto scrollbar-none shrink-0">
        <div className="flex items-center gap-2 border-r border-slate-300 pr-3">
          <button className="p-1 hover:bg-slate-200 rounded transition" title="Undo" disabled><span className="text-xs font-bold opacity-50">↩</span></button>
          <button className="p-1 hover:bg-slate-200 rounded transition" title="Redo" disabled><span className="text-xs font-bold opacity-50">↪</span></button>
        </div>
        <div className="flex items-center gap-2 border-r border-slate-300 pr-3">
          <span className="text-xs font-bold text-slate-400">100%</span>
        </div>
        <div className="flex items-center gap-2 border-r border-slate-300 pr-3">
          <span className="text-xs font-mono bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-800">Arial</span>
          <span className="text-xs font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800">10</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button className="p-1 hover:bg-slate-200 rounded transition font-serif" title="Bold">B</button>
          <button className="p-1 hover:bg-slate-200 rounded transition italic" title="Italic">I</button>
          <button className="p-1 hover:bg-slate-200 rounded transition line-through text-[10px]" title="Strikethrough">Strikethrough</button>
        </div>
      </div>

      {/* FORMULA BAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-1 flex items-center gap-2 text-slate-500 text-xs shrink-0">
        <div className="font-mono bg-slate-50 border border-slate-200 px-3.5 py-0.5 rounded text-slate-800 font-bold select-none min-w-[50px] text-center">
          {activeCell ? `${getColumnLabel(activeCell.col)}${activeCell.row + 1}` : ""}
        </div>
        <div className="h-4 w-px bg-slate-300 mx-1" />
        <span className="font-serif italic font-semibold text-slate-400 text-sm">fx</span>
        <input
          readOnly
          value={activeCellValue}
          className="flex-1 bg-transparent border-none outline-none font-mono text-slate-800 text-xs pl-2"
          placeholder=""
        />
      </div>

      {/* SPREADSHEET GRID WRAPPER */}
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse table-fixed w-full min-w-[800px]">
          <thead>
            {/* Top row: Column Letters */}
            <tr className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-slate-200">
              {/* Corner Header */}
              <th className="w-12 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[10px] text-slate-500 font-medium select-none sticky left-0 top-0 z-20"></th>
              {headers.map((_, colIdx) => (
                <th
                  key={colIdx}
                  className="w-44 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[11px] text-slate-500 font-medium py-1 select-none"
                >
                  {getColumnLabel(colIdx)}
                </th>
              ))}
              {/* Padding Column */}
              <th className="bg-[#f8f9fa] border-b border-slate-300"></th>
            </tr>

            {/* Sub-header row: Actual Field Names / Labels */}
            <tr className="bg-white sticky top-[24px] z-10 border-b border-slate-200 shadow-sm">
              {/* Row Label Number 1 */}
              <td className="w-12 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[11px] text-slate-400 font-semibold select-none sticky left-0 z-20">
                1
              </td>
              {headers.map((header, colIdx) => {
                const isSelected = activeCell?.row === 0 && activeCell?.col === colIdx;
                return (
                  <td
                    key={colIdx}
                    onClick={() => setActiveCell({ row: 0, col: colIdx })}
                    className={cn(
                      "border-r border-b border-slate-200 p-2 text-xs font-bold text-slate-800 truncate cursor-pointer relative",
                      isSelected ? "bg-emerald-50/20 shadow-inner" : "hover:bg-slate-50"
                    )}
                  >
                    {header}
                    {isSelected && (
                      <div className="absolute inset-0 border-[2px] border-emerald-600 pointer-events-none" />
                    )}
                  </td>
                );
              })}
              <td className="bg-white border-b border-slate-200"></td>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              // Empty State Row
              <tr>
                <td className="w-12 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[11px] text-slate-400 font-semibold select-none sticky left-0 z-10">
                  2
                </td>
                <td colSpan={headers.length} className="border-r border-b border-slate-200 p-4 text-xs italic text-slate-400 text-center">
                  No responses recorded yet. Real-time form submissions will automatically sync here.
                </td>
                <td className="border-b border-slate-200"></td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => {
                // Adjust rowIdx by 1 because row 1 is the headers row
                const spreadsheetRowNumber = rowIdx + 2;
                return (
                  <tr key={rowIdx} className="hover:bg-slate-50/[0.4]">
                    {/* Row Label Number */}
                    <td className="w-12 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[11px] text-slate-400 font-semibold select-none sticky left-0 z-10">
                      {spreadsheetRowNumber}
                    </td>
                    {headers.map((header, colIdx) => {
                      const isSelected = activeCell?.row === rowIdx + 1 && activeCell?.col === colIdx;
                      return (
                        <td
                          key={colIdx}
                          onClick={() => setActiveCell({ row: rowIdx + 1, col: colIdx })}
                          className={cn(
                            "border-r border-b border-slate-200 p-2 text-xs text-slate-700 truncate cursor-pointer relative font-mono",
                            isSelected ? "bg-emerald-50/20 shadow-inner" : ""
                          )}
                        >
                          {row[header] || ""}
                          {isSelected && (
                            <div className="absolute inset-0 border-[2px] border-emerald-600 pointer-events-none">
                              {/* Bottom right handle square */}
                              <div className="absolute bottom-[-3.5px] right-[-3.5px] w-2 h-2 bg-emerald-600 border border-white cursor-crosshair" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-200"></td>
                  </tr>
                );
              })
            )}

            {/* Additional empty rows to look like a sheet */}
            {Array.from({ length: Math.max(15 - rows.length, 5) }).map((_, emptyIdx) => {
              const rowNum = rows.length + emptyIdx + 2;
              return (
                <tr key={emptyIdx}>
                  <td className="w-12 bg-[#f8f9fa] border-r border-b border-slate-300 text-center text-[11px] text-slate-400 font-semibold select-none sticky left-0 z-10">
                    {rowNum}
                  </td>
                  {headers.map((_, colIdx) => (
                    <td key={colIdx} className="border-r border-b border-slate-200 p-2 text-xs text-slate-300 select-none"></td>
                  ))}
                  <td className="border-b border-slate-200"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SPREADSHEET FOOTER SHEET TABS */}
      <footer className="bg-[#f8f9fa] border-t border-slate-300 px-4 py-1.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center bg-white border border-slate-200 rounded px-2.5 py-1 text-[#0f9d58] font-bold shadow-sm cursor-pointer select-none text-[11.5px]">
            <span>Form Submissions</span>
            <ChevronDown size={12} className="ml-1" />
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-semibold">
          Synced in real-time
        </div>
      </footer>
    </div>
  );
}
