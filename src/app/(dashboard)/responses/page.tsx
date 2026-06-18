"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/hooks/useApp";
import { dataStore, syncFirestoreToLocal } from "@/lib/store";
import { exportResponsesToCSV } from "@/lib/analytics";
import { EmptyState } from "@/components/ui/PageHeader";
import { Search, Download, FileText, Eye, Edit3, Trash2, Filter, FileSpreadsheet, ChevronRight, ChevronDown, Calendar, Save } from "lucide-react";
import { formatDateTime, downloadFile, cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FormResponseView } from "@/components/form/PublicFormRenderer";
import * as XLSX from "xlsx";
import type { Form, FormResponse } from "@/types";

export default function ResponsesPage() {
  const { user } = useApp();
  const searchParams = useSearchParams();
  const formIdParam = searchParams.get("formId");
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [viewing, setViewing] = useState<FormResponse | null>(null);
  const [editing, setEditing] = useState<FormResponse | null>(null);
  const [deleting, setDeleting] = useState<FormResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    const myForms = dataStore.getForms(user.uid);
    setForms(myForms);
    if (myForms.length > 0 && !selectedFormId) {
      const paramForm = myForms.find((f) => f.id === formIdParam);
      if (paramForm) {
        setSelectedFormId(paramForm.id);
      } else {
        const withResponses = myForms.filter((f) => f.responseCount > 0);
        setSelectedFormId((withResponses[0] ?? myForms[0]).id);
      }
    }

    // Trigger Firestore sync on load/mount
    syncFirestoreToLocal(user.uid);
  }, [user, formIdParam]);

  useEffect(() => {
    if (!selectedFormId) return;
    setResponses(dataStore.getResponses(selectedFormId));
  }, [selectedFormId]);

  // Listen for background sync updates
  useEffect(() => {
    if (!user) return;
    const handleSync = () => {
      const myForms = dataStore.getForms(user.uid);
      setForms(myForms);
      if (myForms.length > 0) {
        const exists = myForms.some((f) => f.id === selectedFormId);
        if (!exists) {
          const withResponses = myForms.filter((f) => f.responseCount > 0);
          setSelectedFormId((withResponses[0] ?? myForms[0]).id);
        } else if (selectedFormId) {
          setResponses(dataStore.getResponses(selectedFormId));
        }
      } else {
        setSelectedFormId(null);
        setResponses([]);
      }
    };
    window.addEventListener("formcraft:sync", handleSync);
    return () => window.removeEventListener("formcraft:sync", handleSync);
  }, [user, selectedFormId]);

  const selectedForm = useMemo(() => forms.find((f) => f.id === selectedFormId) ?? null, [forms, selectedFormId]);

  const filtered = useMemo(() => {
    let list = responses;
    if (dateFilter !== "all") {
      const now = Date.now();
      const limits = { today: 86400000, week: 604800000, month: 2592000000 };
      list = list.filter((r) => now - r.submittedAt <= limits[dateFilter]);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => Object.values(r.data).some((v) => String(v).toLowerCase().includes(s)));
    }
    return list.sort((a, b) => b.submittedAt - a.submittedAt);
  }, [responses, search, dateFilter]);

  const exportCSV = () => {
    if (!selectedForm) return;
    const csv = exportResponsesToCSV(selectedForm, filtered);
    downloadFile(`${selectedForm.title.replace(/\s+/g, "-").toLowerCase()}-responses.csv`, csv);
    toast.success(`Exported ${filtered.length} responses as CSV`);
  };

  const exportExcel = () => {
    if (!selectedForm) return;
    const rows = filtered.map((r) => {
      const row: Record<string, unknown> = { "Submitted At": formatDateTime(r.submittedAt) };
      selectedForm.fields.forEach((f) => {
        const v = r.data[f.label];
        if (f.type === "signature") {
          row[f.label] = v ? "[Signature]" : "";
        } else {
          row[f.label] = Array.isArray(v) ? v.join(", ") : v ?? "";
        }
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");
    XLSX.writeFile(wb, `${selectedForm.title.replace(/\s+/g, "-").toLowerCase()}-responses.xlsx`);
    toast.success(`Exported ${filtered.length} responses as Excel`);
  };

  const handleDelete = () => {
    if (!deleting) return;
    dataStore.deleteResponse(deleting.id);
    setResponses(dataStore.getResponses(selectedFormId!));
    setDeleting(null);
    toast.success("Response deleted");
  };

  return (
    <div className="page-enter py-2">
      {/* Title & Actions Row */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extralight tracking-tight text-black leading-none">Responses</h1>
          <p className="text-sm text-black/45 mt-1.5">View, filter, and export form submissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportCSV} 
            disabled={!selectedForm || filtered.length === 0} 
            className="bg-white border border-black/5 hover:border-black/15 text-black/70 hover:text-black px-4 py-2 rounded-full text-xs font-bold transition disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download size={13} className="inline mr-1" /> CSV
          </button>
          <button 
            onClick={exportExcel} 
            disabled={!selectedForm || filtered.length === 0} 
            className="bg-black hover:bg-black/85 text-white px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Crextio Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="crextio-panel p-6 flex flex-col justify-between min-h-[110px]">
          <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Total Responses</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[36px] font-extralight text-black leading-none">{responses.length}</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-white/50">
              <FileText size={14} />
            </span>
          </div>
        </div>

        <div className="crextio-panel p-6 flex flex-col justify-between min-h-[110px]">
          <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">This Week</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[36px] font-extralight text-black leading-none">
              {responses.filter((r) => Date.now() - r.submittedAt < 604800000).length}
            </span>
            <span className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-white/50">
              <Calendar size={14} />
            </span>
          </div>
        </div>

        <div className="crextio-panel p-6 flex flex-col justify-between min-h-[110px]">
          <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Active Forms</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[36px] font-extralight text-black leading-none">{forms.length}</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-white/50">
              <Filter size={14} />
            </span>
          </div>
        </div>

        <div className="crextio-panel p-6 flex flex-col justify-between min-h-[110px]">
          <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Avg per Day</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[36px] font-extralight text-black leading-none">{Math.round(responses.length / 30) || 0}</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-white/50">
              <FileText size={14} />
            </span>
          </div>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="crextio-panel-static p-10 text-center">
          <EmptyState
            icon={FileText}
            title="No forms yet"
            description="Create your first form to start collecting responses."
            action={<Link href="/forms" className="bg-black text-white hover:bg-black/85 px-5 py-2.5 rounded-full text-sm font-bold transition inline-block">Go to forms</Link>}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Forms Selector: Dropdown on Mobile/Tablet, Sidebar List on Desktop */}
          <div className="block lg:hidden w-full">
            <label className="text-[10px] font-bold text-black/45 uppercase tracking-wider block mb-1.5">Select Form</label>
            <div className="relative">
              <select
                value={selectedFormId || ""}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-2xl pl-4 pr-10 py-3 text-xs sm:text-sm font-semibold text-black shadow-sm outline-none transition focus:border-black/20 appearance-none"
              >
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} ({f.responseCount} responses)
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-55" />
            </div>
          </div>

          <div className="hidden lg:block crextio-panel p-3 h-fit lg:sticky lg:top-4">
            <div className="px-3 py-2 text-[10px] font-bold text-black/45 uppercase tracking-wider">Select Form</div>
            <div className="space-y-1.5 mt-1.5">
              {forms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormId(f.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between transition",
                    selectedFormId === f.id 
                      ? "bg-[#222222] text-white shadow-sm" 
                      : "hover:bg-black/5 text-black/75"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs sm:text-sm font-bold truncate", selectedFormId === f.id ? "text-white" : "text-black")}>{f.title}</div>
                    <div className={cn("text-[11px] mt-0.5", selectedFormId === f.id ? "text-white/60" : "text-black/45")}>{f.responseCount} responses</div>
                  </div>
                  <ChevronRight size={13} className={selectedFormId === f.id ? "text-white/40" : "text-black/30"} />
                </button>
              ))}
            </div>
          </div>

          {/* Main Table Column */}
          <div className="space-y-4">
            {/* Table Filter Bar */}
            <div className="crextio-panel p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="Search response data..." 
                  className="w-full bg-black/5 border border-transparent focus:border-black/10 rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-black placeholder-black/40 outline-none transition" 
                />
              </div>
              <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value as "all" | "today" | "week" | "month")} 
                className="bg-black/5 border border-transparent focus:border-black/10 rounded-full px-4 py-2 text-xs sm:text-sm text-black outline-none transition"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>

            {!selectedForm ? (
              <div className="crextio-panel-static p-8 text-center">
                <EmptyState icon={FileText} title="Select a form" description="Choose a form from the list to view its responses." />
              </div>
            ) : filtered.length === 0 ? (
              <div className="crextio-panel-static p-8 text-center">
                <EmptyState icon={FileText} title="No responses yet" description="When people submit your form, their responses will appear here." />
              </div>
            ) : (
              <div className="crextio-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead>
                      <tr className="border-b border-black/5 bg-[#fcfbfa]/80">
                        <th className="px-4 py-3.5 text-xs text-black/50 uppercase font-bold tracking-wider align-middle">Submitted</th>
                        {selectedForm.fields.slice(0, 3).map((f) => (
                          <th key={f.id} className="px-4 py-3.5 text-xs text-black/50 uppercase font-bold tracking-wider align-middle">{f.label}</th>
                        ))}
                        <th className="px-4 py-3.5 text-right text-xs text-black/50 uppercase font-bold tracking-wider align-middle">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-black/[0.01] transition group">
                          <td className="px-4 py-3.5 text-black/50 whitespace-nowrap align-middle">{formatDateTime(r.submittedAt)}</td>
                          {selectedForm.fields.slice(0, 3).map((f) => {
                            const v = r.data[f.label];
                            if (f.type === "file" && typeof v === "string" && v) {
                              const filename = v.split("/").pop()?.replace(/^\d+_/, "") || "Uploaded File";
                              return (
                                <td key={f.id} className="px-4 py-3.5 max-w-[200px] truncate align-middle">
                                  <a
                                    href={v}
                                    download={filename}
                                    title="Click to download file"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/[0.04] hover:bg-black/[0.08] text-black rounded-full text-xs font-semibold max-w-full transition"
                                  >
                                    <Download size={11} className="text-black/60 shrink-0" />
                                    <span className="truncate">{filename}</span>
                                  </a>
                                </td>
                              );
                            }
                            
                            let display = "—";
                            if (f.type === "signature") {
                              display = v ? "[Signature]" : "—";
                            } else {
                              display = Array.isArray(v) ? v.join(", ") : v ? String(v) : "—";
                            }
                            return (
                              <td key={f.id} className="px-4 py-3.5 max-w-[200px] truncate text-black font-medium align-middle">
                                {display}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3.5 text-right align-middle">
                            <div className="inline-flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewing(r)} className="p-1.5 text-black/40 hover:bg-black/5 hover:text-black rounded-full transition" title="View">
                                <Eye size={13} />
                              </button>
                              <button onClick={() => setEditing(r)} className="p-1.5 text-black/40 hover:bg-black/5 hover:text-black rounded-full transition" title="Edit">
                                <Edit3 size={13} />
                              </button>
                              <button onClick={() => setDeleting(r)} className="p-1.5 text-black/40 hover:bg-red-500/10 hover:text-red-600 rounded-full transition" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-[#fcfbfa]/80 border-t border-black/5 text-xs text-black/50 font-bold uppercase tracking-wider">
                  Showing {filtered.length} of {responses.length} responses
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Response Details View Modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Response details"
        size="md"
      >
        {viewing && selectedForm && (
          <div>
            <div className="text-xs text-black/45 mb-4">Submitted {formatDateTime(viewing.submittedAt)}</div>
            <FormResponseView response={viewing} fields={selectedForm.fields} />
          </div>
        )}
      </Modal>

      {/* Response Edit Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit response"
        size="md"
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-secondary rounded-full">Cancel</button>
            <button onClick={() => {
              if (!editing) return;
              dataStore.updateResponse(editing.id, editing.data);
              setResponses(dataStore.getResponses(selectedFormId!));
              setEditing(null);
              toast.success("Response updated successfully");
            }} className="bg-black text-white hover:bg-black/85 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 transition"><Save size={13} /> Save changes</button>
          </>
        }
      >
        {editing && selectedForm && (
          <div className="space-y-4">
            {selectedForm.fields.map((f) => (
              <div key={f.id}>
                <label className="label text-xs uppercase tracking-wider text-black/60 font-bold">{f.label}</label>
                {Array.isArray(editing.data[f.label]) ? (
                  <input
                    value={(editing.data[f.label] as string[]).join(", ")}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.label]: e.target.value.split(",").map((s) => s.trim()) } })}
                    className="input rounded-full"
                  />
                ) : f.type === "textarea" ? (
                  <textarea
                    value={(editing.data[f.label] as string) ?? ""}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.label]: e.target.value } })}
                    className="input rounded-[20px]"
                    rows={3}
                  />
                ) : f.type === "rating" ? (
                  <input
                    type="number"
                    value={(editing.data[f.label] as number) ?? 0}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.label]: Number(e.target.value) } })}
                    className="input rounded-full"
                  />
                ) : (
                  <input
                    value={(editing.data[f.label] as string) ?? ""}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.label]: e.target.value } })}
                    className="input rounded-full"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete response?"
        description="This will permanently remove this submission. This cannot be undone."
        confirmText="Delete"
        destructive
      />
    </div>
  );
}