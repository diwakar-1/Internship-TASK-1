"use client";
import { useEffect, useState, useMemo } from "react";
import { useApp } from "@/hooks/useApp";
import { dataStore, syncFirestoreToLocal } from "@/lib/store";
import { computeAnalytics } from "@/lib/analytics";
import { EmptyState } from "@/components/ui/PageHeader";
import { BarChart3, TrendingUp, Eye, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import type { Form, FormResponse } from "@/types";

const PIE_COLORS = ["#222222", "#4f46e5", "#10b981", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444"];

export default function AnalyticsPage() {
  const { user } = useApp();
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const myForms = dataStore.getForms(user.uid).filter((f) => f.status === "published");
    setForms(myForms);
    if (myForms.length > 0 && !selectedFormId) setSelectedFormId(myForms[0].id);

    // Sync on mount
    syncFirestoreToLocal(user.uid);
  }, [user]);

  useEffect(() => {
    if (!selectedFormId) return;
    setResponses(dataStore.getResponses(selectedFormId));
  }, [selectedFormId]);

  // Listen for background sync updates
  useEffect(() => {
    if (!user) return;
    const handleSync = () => {
      const myForms = dataStore.getForms(user.uid).filter((f) => f.status === "published");
      setForms(myForms);
      if (myForms.length > 0) {
        const exists = myForms.some((f) => f.id === selectedFormId);
        if (!exists) {
          setSelectedFormId(myForms[0].id);
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

  const form = useMemo(() => forms.find((f) => f.id === selectedFormId) ?? null, [forms, selectedFormId]);
  const analytics = useMemo(() => form ? computeAnalytics(form, responses) : null, [form, responses]);

  const formatTime = (ms: number) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  if (forms.length === 0) {
    return (
      <div className="page-enter py-2">
        <div className="mb-6">
          <h1 className="text-[34px] font-extralight tracking-tight text-black leading-none">Analytics</h1>
          <p className="text-sm text-black/45 mt-1.5">Track form performance and response patterns.</p>
        </div>
        <div className="crextio-panel-static p-10 text-center">
          <EmptyState
            icon={BarChart3}
            title="No published forms yet"
            description="Publish a form to start collecting responses and viewing analytics."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter py-2">
      {/* Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extralight tracking-tight text-black leading-none">Analytics</h1>
          <p className="text-sm text-black/45 mt-1.5">Track form performance and response patterns.</p>
        </div>
      </div>

      {/* Form Selector Pills */}
      <div className="mb-8 flex flex-wrap gap-2.5">
        {forms.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFormId(f.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs sm:text-[13px] font-bold border transition",
              selectedFormId === f.id 
                ? "bg-[#222222] text-white border-transparent shadow-sm" 
                : "bg-white text-black/75 border-black/5 hover:border-black/15 hover:shadow-sm"
            )}
          >
            {f.title}
          </button>
        ))}
      </div>

      {analytics && form && (
        <div className="space-y-6">
          {/* Custom Stats Grid - Crextio style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat 1 */}
            <div className="crextio-panel p-6 flex flex-col justify-between min-h-[120px]">
              <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Total Responses</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[36px] font-extralight text-black leading-none">{analytics.totalResponses}</span>
                <span className="w-8 h-8 rounded-xl bg-[#c7d2fe]/40 text-brand-600 flex items-center justify-center border border-white/50">
                  <CheckCircle2 size={15} />
                </span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="crextio-panel p-6 flex flex-col justify-between min-h-[120px]">
              <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Total Views</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[36px] font-extralight text-black leading-none">{analytics.totalViews}</span>
                <span className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-white/50">
                  <Eye size={15} />
                </span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="crextio-panel p-6 flex flex-col justify-between min-h-[120px]">
              <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Conversion Rate</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[36px] font-extralight text-black leading-none">{analytics.conversionRate.toFixed(1)}%</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-white/50">
                  <TrendingUp size={15} />
                </span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="crextio-panel p-6 flex flex-col justify-between min-h-[120px]">
              <div className="text-[11px] font-bold text-black/45 tracking-wider uppercase">Avg. Completion</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[36px] font-extralight text-black leading-none">{formatTime(analytics.averageCompletionTime)}</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-white/50">
                  <Clock size={15} />
                </span>
              </div>
            </div>
          </div>

          {/* Area Chart — Responses over time */}
          <div className="crextio-panel p-6">
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">Responses over time</h3>
              <p className="text-xs text-black/45 mt-0.5 mb-5">Last 30 days history</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.responsesByDay}>
                  <defs>
                    <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#222222" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#222222" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1edf8" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8c8796", fontWeight: 600 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8c8796", fontWeight: 600 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", fontSize: 12, backgroundColor: "rgba(255,255,255,0.95)" }} />
                  <Area type="monotone" dataKey="count" stroke="#222222" strokeWidth={2.5} fill="url(#areaG)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Field Summary Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {form.fields
              .filter((f) => ["radio", "dropdown", "checkbox", "rating", "number"].includes(f.type))
              .map((field) => {
                const summary = analytics.fieldSummaries[field.id];
                if (!summary) return null;
                if ((field.type === "radio" || field.type === "dropdown" || field.type === "checkbox") && summary.distribution) {
                  const data = Object.entries(summary.distribution).map(([name, value]) => ({ name, value }));
                  return (
                    <div key={field.id} className="crextio-panel p-6">
                      <h4 className="text-sm font-bold text-black">{field.label}</h4>
                      <p className="text-xs text-black/45 mt-0.5 mb-4">{summary.responseRate.toFixed(0)}% response rate</p>
                      {data.every((d) => d.value === 0) ? (
                        <div className="h-40 flex items-center justify-center text-xs text-black/35 font-semibold">No data collected yet</div>
                      ) : (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", fontSize: 12 }} />
                              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                }
                if ((field.type === "rating" || field.type === "number") && summary.average !== undefined) {
                  return (
                    <div key={field.id} className="crextio-panel p-6">
                      <h4 className="text-sm font-bold text-black">{field.label}</h4>
                      <p className="text-xs text-black/45 mt-0.5 mb-5">Average rating: <span className="font-bold text-black">{summary.average.toFixed(1)}</span></p>
                      <div className="flex items-end gap-3.5 h-36 px-2">
                        {Array.from({ length: field.validation.max ?? 5 }).map((_, i) => {
                          const responsesForBucket = responses.filter((r) => Number(r.data[field.label]) === i + 1).length;
                          const max = Math.max(...Array.from({ length: field.validation.max ?? 5 }).map((_, j) => responses.filter((r) => Number(r.data[field.label]) === j + 1).length), 1);
                          const h = (responsesForBucket / max) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                              <div
                                className="w-full rounded-t-xl transition-all duration-500 relative overflow-hidden"
                                style={{ height: `${h}%`, minHeight: 2 }}
                              >
                                <div className="absolute inset-0 bg-black hatch-dark" />
                              </div>
                              <div className="text-[11px] font-bold text-black/45">{i + 1}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
          </div>

          {/* Field Completion Rates */}
          <div className="crextio-panel p-6">
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">Field completion rates</h3>
              <p className="text-xs text-black/45 mt-0.5 mb-5">Percentage of responses that contain each form input.</p>
            </div>
            <div className="space-y-4">
              {form.fields.map((f) => {
                const rate = analytics.fieldSummaries[f.id]?.responseRate ?? 0;
                return (
                  <div key={f.id} className="flex items-center gap-4">
                    <div className="w-36 sm:w-44 truncate text-[13px] text-black font-semibold">{f.label}</div>
                    <div className="flex-1 h-3 bg-black/5 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-black hatch-dark rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-black/60 font-bold">{rate.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}