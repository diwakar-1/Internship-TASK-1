"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { dataStore, generateId, createForm, defaultTheme, defaultSettings } from "@/lib/store";
import type { Form, FormVersion } from "@/types";
import { FieldEditor } from "@/components/form/FieldEditor";
import { ThemeCustomizer } from "@/components/form/ThemeCustomizer";
import { PublicFormRenderer } from "@/components/form/PublicFormRenderer";
import { ShareDialog } from "@/components/form/ShareDialog";
import { ArrowLeft, Eye, Save, Share2, Settings, History, Rocket, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { debounce, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "build" | "design" | "settings" | "preview" | "share" | "history";

export default function FormEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("build");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let f = dataStore.getForm(params.id);
    if (!f) {
      const newForm = createForm("current", "Untitled form");
      newForm.id = params.id;
      f = newForm;
    }
    setForm(f);
    setLastSaved(f.updatedAt);
    setLoading(false);
  }, [params.id]);

  const saveForm = useCallback(
    debounce((f: Form) => {
      dataStore.saveForm(f);
      setSaving(false);
      setLastSaved(Date.now());
    }, 600),
    []
  );

  const updateForm = (updates: Partial<Form>) => {
    if (!form) return;
    const updated = { ...form, ...updates };
    setForm(updated);
    setSaving(true);
    saveForm(updated);
  };

  const handlePublish = () => {
    if (!form) return;
    if (form.fields.length === 0) {
      toast.error("Add at least one field before publishing");
      return;
    }
    const versionId = generateId("v_");
    const version: FormVersion = {
      versionId,
      createdAt: Date.now(),
      snapshot: { title: form.title, description: form.description, fields: form.fields, theme: form.theme, settings: form.settings },
    };
    const updated: Form = {
      ...form,
      status: "published",
      publishedAt: form.publishedAt ?? Date.now(),
      versions: [...form.versions, version],
    };
    dataStore.saveForm(updated);
    setForm(updated);
    toast.success("Form published! It's now live.");
    setShowMenu(false);
  };

  const handleUnpublish = () => {
    if (!form) return;
    const updated = { ...form, status: "draft" as const };
    dataStore.saveForm(updated);
    setForm(updated);
    toast.success("Form unpublished");
    setShowMenu(false);
  };

  const handleSaveVersion = () => {
    if (!form) return;
    const versionId = generateId("v_");
    const version: FormVersion = {
      versionId,
      createdAt: Date.now(),
      snapshot: { title: form.title, description: form.description, fields: form.fields, theme: form.theme, settings: form.settings },
    };
    const updated = { ...form, versions: [...form.versions, version] };
    dataStore.saveForm(updated);
    setForm(updated);
    toast.success(`Version ${form.versions.length + 1} saved`);
    setShowMenu(false);
  };

  const handleRestoreVersion = (v: FormVersion) => {
    if (!form) return;
    if (!confirm("Restore this version? Your current changes will be saved as a new version first.")) return;
    handleSaveVersion();
    const updated: Form = {
      ...form,
      title: v.snapshot.title,
      description: v.snapshot.description,
      fields: v.snapshot.fields,
      theme: v.snapshot.theme,
      settings: v.snapshot.settings,
    };
    dataStore.saveForm(updated);
    setForm(updated);
    toast.success("Version restored");
  };

  if (loading || !form) {
    return (
      <div className="p-8 flex items-center justify-center bg-[#f4f1f8] min-h-screen">
        <Loader2 className="animate-spin text-black/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1f8]">
      <header className="bg-white border-b border-black/5 sticky top-0 z-20">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/forms" className="text-black/45 hover:text-black/70" title="Back">
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
          <input
            value={form.title}
            onChange={(e) => updateForm({ title: e.target.value })}
            className="font-semibold text-ink-900 bg-transparent border-none outline-none focus:bg-black/[0.02] px-2 py-1 rounded flex-1 min-w-0 max-w-md"
          />
          <div className="hidden sm:flex items-center gap-3 text-xs text-black/45">
            {saving ? (
              <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving...</span>
            ) : lastSaved ? (
              <span>Saved {timeAgo(lastSaved)}</span>
            ) : null}
            {form.status === "published" && (
              <span className="chip bg-green-50 text-green-700">● Live</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setTab("preview")} className="btn-ghost text-sm hidden sm:flex">
              <Eye size={16} strokeWidth={2} /> Preview
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="btn-primary text-sm">
                {form.status === "published" ? <><Rocket size={16} strokeWidth={2} /> Published</> : <><Rocket size={16} strokeWidth={2} /> Publish</>}
                <ChevronDown size={14} strokeWidth={2} />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-black/5 shadow-soft py-1.5 z-30 animate-fade-in">
                  {form.status === "published" ? (
                    <button onClick={handleUnpublish} className="block w-full text-left px-4 py-2 text-sm text-black/75 hover:bg-black/[0.02] transition">Unpublish</button>
                  ) : (
                    <button onClick={handlePublish} className="block w-full text-left px-4 py-2 text-sm text-black/75 hover:bg-black/[0.02] transition">Publish form</button>
                  )}
                  <button onClick={handleSaveVersion} className="block w-full text-left px-4 py-2 text-sm text-black/75 hover:bg-black/[0.02] transition">Save version snapshot</button>
                  {form.status === "published" && (
                    <Link href={`/forms/${form.id}`} target="_blank" className="block w-full text-left px-4 py-2 text-sm text-black/75 hover:bg-black/[0.02] transition flex items-center gap-2">
                      <ExternalLink size={14} strokeWidth={2} /> Open live form
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-black/5">
          {[
            { id: "build", label: "Build", icon: Settings },
            { id: "design", label: "Design", icon: Palette },
            { id: "settings", label: "Settings", icon: Settings },
            { id: "preview", label: "Preview", icon: Eye },
            { id: "share", label: "Share", icon: Share2 },
            { id: "history", label: "History", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={cn(
                "px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition flex items-center gap-1.5",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-black/45 hover:text-ink-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className={cn("p-4 sm:p-6 mx-auto transition-all duration-300", tab === "build" ? "max-w-[1600px]" : "max-w-3xl")}>
        {tab === "build" && (
          <FieldEditor
            fields={form.fields}
            onChange={(fields) => updateForm({ fields })}
            description={form.description}
            onDescriptionChange={(description) => updateForm({ description })}
          />
        )}
        {tab === "design" && <ThemeCustomizer theme={form.theme} onChange={(theme) => updateForm({ theme })} />}
        {tab === "settings" && <FormSettingsPanel form={form} onChange={updateForm} />}
        {tab === "preview" && (
          <div className="rounded-2xl p-6 sm:p-8 panel" style={{ backgroundColor: form.theme.backgroundColor }}>
            <h1 className="text-2xl font-bold mb-1" style={{ color: form.theme.textColor }}>{form.title}</h1>
            {form.description && <p className="mb-6 opacity-70" style={{ color: form.theme.textColor }}>{form.description}</p>}
            <PublicFormRenderer fields={form.fields} theme={form.theme} settings={form.settings} preview onSubmit={() => {}} />
          </div>
        )}
        {tab === "share" && <ShareDialog form={form} />}
        {tab === "history" && <VersionHistory form={form} onRestore={handleRestoreVersion} />}
      </div>

      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}
    </div>
  );
}

import { Palette } from "lucide-react";

function FormSettingsPanel({ form, onChange }: { form: Form; onChange: (u: Partial<Form>) => void }) {
  return (
    <div className="panel panel-pad space-y-5">
      <div>
        <h3 className="font-semibold text-ink-900 mb-3">Form details</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={(e) => onChange({ title: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => onChange({ description: e.target.value })} className="input" rows={3} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input
              value={form.tags.join(", ")}
              onChange={(e) => onChange({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="feedback, survey, customer"
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-black/5">
        <h3 className="font-semibold text-ink-900 mb-3">Submission</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Submit button text</label>
            <input value={form.settings.submitButtonText} onChange={(e) => onChange({ settings: { ...form.settings, submitButtonText: e.target.value } })} className="input" />
          </div>
          <div>
            <label className="label">Success message</label>
            <textarea value={form.settings.successMessage} onChange={(e) => onChange({ settings: { ...form.settings, successMessage: e.target.value } })} className="input" rows={2} />
          </div>
          <div>
            <label className="label">Redirect URL (optional)</label>
            <input value={form.settings.redirectUrl ?? ""} onChange={(e) => onChange({ settings: { ...form.settings, redirectUrl: e.target.value } })} placeholder="https://example.com/thank-you" className="input" />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.settings.showProgressBar} onChange={(e) => onChange({ settings: { ...form.settings, showProgressBar: e.target.checked } })} className="rounded" />
            Show progress bar
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.settings.allowMultipleSubmissions} onChange={(e) => onChange({ settings: { ...form.settings, allowMultipleSubmissions: e.target.checked } })} className="rounded" />
            Allow multiple submissions from same user
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.settings.passwordProtected} onChange={(e) => onChange({ settings: { ...form.settings, passwordProtected: e.target.checked, password: e.target.checked ? form.settings.password : undefined } })} className="rounded" />
            Password protect this form
          </label>
          {form.settings.passwordProtected && (
            <input type="text" value={form.settings.password ?? ""} onChange={(e) => onChange({ settings: { ...form.settings, password: e.target.value } })} placeholder="Form password" className="input mt-1" />
          )}
        </div>
      </div>
    </div>
  );
}

function VersionHistory({ form, onRestore }: { form: Form; onRestore: (v: FormVersion) => void }) {
  if (form.versions.length === 0) {
    return (
      <div className="panel panel-pad text-center">
        <History className="mx-auto text-black/20 mb-3" size={40} strokeWidth={1.5} />
        <h3 className="font-semibold text-ink-900">No versions saved yet</h3>
        <p className="text-sm text-black/45 mt-1">Save a version snapshot to track changes over time.</p>
      </div>
    );
  }
  return (
    <div className="panel divide-y divide-black/5">
      {[...form.versions].reverse().map((v, i) => (
        <div key={v.versionId} className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-semibold">
            {form.versions.length - i}
          </div>
          <div className="flex-1">
            <div className="font-medium text-ink-900 text-sm">Version {form.versions.length - i}</div>
            <div className="text-xs text-black/45">{timeAgo(v.createdAt)} · {v.snapshot.fields.length} fields</div>
          </div>
          <button onClick={() => onRestore(v)} className="btn-secondary text-xs">Restore</button>
        </div>
      ))}
    </div>
  );
}