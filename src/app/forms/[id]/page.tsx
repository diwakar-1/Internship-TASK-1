"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { dataStore } from "@/lib/store";
import type { Form } from "@/types";
import { PublicFormRenderer } from "@/components/form/PublicFormRenderer";
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { generateId } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function PublicFormPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isEmbed = searchParams.get("embed") === "1";
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    const f = dataStore.getPublicForm(params.id);
    setForm(f);
    setLoading(false);
    if (f) {
      if (f.settings.passwordProtected) setUnlocked(false);
      else setUnlocked(true);
      if (f.settings.closeDate && Date.now() > f.settings.closeDate) setClosed(true);
      dataStore.incrementViewCount(f.id);
      (window as unknown as { __formStart?: number }).__formStart = Date.now();
    }
  }, [params.id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!form) return;
    const response = {
      id: generateId("resp_"),
      formId: form.id,
      formVersionId: form.versions[form.versions.length - 1]?.versionId ?? "v1",
      data,
      submittedAt: Date.now(),
      submitterEmail: form.settings.collectEmail ? (data["Email"] as string) : undefined,
      completionTimeMs: Date.now() - ((window as unknown as { __formStart?: number }).__formStart ?? Date.now()),
    };
    dataStore.saveResponse(response);
    toast.success("Response submitted!");

    // Send Slack alert if configured in local integrations
    try {
      const saved = localStorage.getItem("formcraft:integrations");
      if (saved) {
        const integrations = JSON.parse(saved);
        if (integrations.slackAlerts?.connected && integrations.slackAlerts?.webhookUrl) {
          fetch("/api/integrations/slack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              webhookUrl: integrations.slackAlerts.webhookUrl,
              channel: integrations.slackAlerts.channel,
              formTitle: form.title,
              responseData: data,
              submittedAt: response.submittedAt,
              submitterEmail: response.submitterEmail,
              isTest: false,
            }),
          }).catch((err) => console.error("Error sending Slack alert:", err));
        }

        if (integrations.googleSheets?.connected && integrations.googleSheets?.spreadsheetUrl) {
          fetch("/api/integrations/google-sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scriptUrl: integrations.googleSheets.spreadsheetUrl,
              formTitle: form.title,
              responseData: data,
              submittedAt: response.submittedAt,
              submitterEmail: response.submitterEmail,
            }),
          }).catch((err) => console.error("Error sending response to Google Sheets:", err));
        }
      }
    } catch (err) {
      console.error("Integration triggers failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card p-8 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-xl font-semibold mb-1">Form not found</h2>
          <p className="text-slate-500">This form may have been deleted, archived, or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-1">This form is closed</h2>
          <p className="text-slate-500">Submissions are no longer being accepted.</p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card p-8 max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-semibold text-center mb-1">Password required</h2>
          <p className="text-slate-500 text-center text-sm mb-6">Enter the password to access this form.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password === form.settings.password) setUnlocked(true);
              else toast.error("Incorrect password");
            }}
            className="space-y-3"
          >
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input"
            />
            <button type="submit" className="btn-primary w-full">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {!isEmbed && (
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <img src="/logo.png" alt="FormCraft Logo" className="w-4 h-4 object-contain" /> <span className="font-gnome-bc font-semibold">FormCraft</span>
          </Link>
        </div>
      )}
      <div className={isEmbed ? "p-4" : "py-6 px-4"}>
        <div className="rounded-2xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto" style={{ backgroundColor: form.theme.backgroundColor }}>
          {form.theme.showLogo && form.theme.logoUrl && (
            <img src={form.theme.logoUrl} alt="Logo" className="h-10 mb-4" />
          )}
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: form.theme.textColor }}>{form.title}</h1>
          {form.description && (
            <p className="mb-6 opacity-70" style={{ color: form.theme.textColor }}>{form.description}</p>
          )}
          <PublicFormRenderer
            fields={form.fields}
            theme={form.theme}
            settings={form.settings}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
