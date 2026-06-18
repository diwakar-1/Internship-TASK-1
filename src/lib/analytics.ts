import type { Form, FormResponse, AnalyticsData, FormField } from "@/types";
import { format, subDays, startOfDay } from "date-fns";

export function computeAnalytics(form: Form, responses: FormResponse[]): AnalyticsData {
  const totalResponses = responses.length;
  const totalViews = form.viewCount ?? 0;
  const conversionRate = totalViews > 0 ? (totalResponses / totalViews) * 100 : 0;
  const completionTimes = responses.filter((r) => r.completionTimeMs).map((r) => r.completionTimeMs!);
  const averageCompletionTime =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = startOfDay(subDays(new Date(), i)).getTime();
    days.push({ date: format(d, "MMM d"), count: 0 });
  }
  responses.forEach((r) => {
    const day = format(startOfDay(r.submittedAt), "MMM d");
    const entry = days.find((d) => d.date === day);
    if (entry) entry.count += 1;
  });

  const fieldSummaries: AnalyticsData["fieldSummaries"] = {};
  form.fields.forEach((field) => {
    fieldSummaries[field.id] = summarizeField(field, responses);
  });

  return {
    totalResponses,
    totalViews,
    conversionRate,
    averageCompletionTime,
    responsesByDay: days,
    fieldSummaries,
  };
}

function summarizeField(field: FormField, responses: FormResponse[]) {
  const total = responses.length;
  const populated = responses.filter((r) => {
    const v = r.data[field.label];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const responseRate = total > 0 ? (populated / total) * 100 : 0;

  if (field.type === "rating" || field.type === "number") {
    const nums = responses
      .map((r) => Number(r.data[field.label]))
      .filter((n) => !Number.isNaN(n));
    const average = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
    return { fieldLabel: field.label, type: field.type, average, responseRate };
  }

  if (field.type === "radio" || field.type === "dropdown") {
    const distribution: Record<string, number> = {};
    field.options?.forEach((o) => (distribution[o.label] = 0));
    responses.forEach((r) => {
      const v = r.data[field.label] as string | undefined;
      if (v) {
        const opt = field.options?.find((o) => o.value === v);
        const key = opt?.label ?? v;
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
    });
    return { fieldLabel: field.label, type: field.type, distribution, responseRate };
  }

  if (field.type === "checkbox") {
    const distribution: Record<string, number> = {};
    field.options?.forEach((o) => (distribution[o.label] = 0));
    responses.forEach((r) => {
      const v = r.data[field.label];
      if (Array.isArray(v)) {
        v.forEach((val) => {
          const opt = field.options?.find((o) => o.value === val);
          const key = opt?.label ?? String(val);
          distribution[key] = (distribution[key] ?? 0) + 1;
        });
      }
    });
    return { fieldLabel: field.label, type: field.type, distribution, responseRate };
  }

  return { fieldLabel: field.label, type: field.type, responseRate };
}

export function exportResponsesToCSV(form: Form, responses: FormResponse[]): string {
  const headers = ["Response ID", "Submitted At", ...form.fields.map((f) => f.label)];
  const rows = responses.map((r) => {
    const cells = [
      r.id,
      new Date(r.submittedAt).toISOString(),
      ...form.fields.map((f) => {
        const v = r.data[f.label];
        if (f.type === "signature") return v ? "[Signature]" : "";
        if (Array.isArray(v)) return v.join("; ");
        if (v === undefined || v === null) return "";
        return String(v).replace(/"/g, '""');
      }),
    ];
    return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}
