"use client";
import { Palette, Image as ImageIcon, Type as TypeIcon, Square } from "lucide-react";
import type { FormTheme } from "@/types";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", "#0ea5e9", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#14b8a6",
];

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "system-ui", label: "System" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', monospace", label: "Monospace" },
];

const RADIUS_OPTIONS: { value: FormTheme["borderRadius"]; label: string }[] = [
  { value: "none", label: "Sharp" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra" },
  { value: "full", label: "Pill" },
];

interface Props {
  theme: FormTheme;
  onChange: (theme: FormTheme) => void;
}

export function ThemeCustomizer({ theme, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Color palette</h3>
        <p className="text-sm text-black/45 mb-4">Customize the look and feel of your form.</p>

        <div className="space-y-5">
          <div>
            <label className="label flex items-center gap-1.5"><Palette size={14} strokeWidth={2} /> Primary color</label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ ...theme, primaryColor: c })}
                  className={cn("w-8 h-8 rounded-lg border-2 transition", theme.primaryColor === c ? "border-ink-900 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => onChange({ ...theme, primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border border-black/10"
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => onChange({ ...theme, primaryColor: e.target.value })}
                className="input flex-1 max-w-[140px]"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.backgroundColor} onChange={(e) => onChange({ ...theme, backgroundColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={theme.backgroundColor} onChange={(e) => onChange({ ...theme, backgroundColor: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Text color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={theme.textColor} onChange={(e) => onChange({ ...theme, textColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={theme.textColor} onChange={(e) => onChange({ ...theme, textColor: e.target.value })} className="input" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Typography & shape</h3>
        <p className="text-sm text-black/45 mb-4">Choose fonts and field border radius.</p>

        <div className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5"><TypeIcon size={14} strokeWidth={2} /> Font family</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => onChange({ ...theme, fontFamily: f.value })}
                  className={cn("p-2.5 text-sm border rounded-xl", theme.fontFamily === f.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-black/10 hover:bg-black/[0.02]")}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1.5"><Square size={14} strokeWidth={2} /> Border radius</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => onChange({ ...theme, borderRadius: r.value })}
                  className={cn("p-2.5 text-sm border", theme.borderRadius === r.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-black/10 hover:bg-black/[0.02]")}
                  style={{ borderRadius: r.value === "none" ? 0 : r.value === "sm" ? 2 : r.value === "md" ? 6 : r.value === "lg" ? 8 : r.value === "xl" ? 12 : 9999 }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Branding</h3>
        <p className="text-sm text-black/45 mb-4">Add your logo and customize branding elements.</p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={theme.showLogo ?? false} onChange={(e) => onChange({ ...theme, showLogo: e.target.checked })} className="rounded" />
            Show logo at the top of the form
          </label>
          {theme.showLogo && (
            <div>
              <label className="label">Logo URL</label>
              <input value={theme.logoUrl ?? ""} onChange={(e) => onChange({ ...theme, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" className="input" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={theme.showBranding ?? true} onChange={(e) => onChange({ ...theme, showBranding: e.target.checked })} className="rounded" />
            Show "Powered by FormCraft" footer
          </label>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-3">Live preview</h3>
        <div className="rounded-xl p-6 border border-black/5" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor, fontFamily: theme.fontFamily }}>
          <h2 className="text-xl font-bold mb-1">Sample Form Title</h2>
          <p className="text-sm mb-4 opacity-70">This is how your form will appear to respondents.</p>
          <label className="block text-sm font-medium mb-1.5">Sample question <span className="text-red-500">*</span></label>
          <input className="w-full px-3 py-2 border bg-transparent mb-3" style={{ borderColor: theme.textColor + "30", borderRadius: theme.borderRadius === "none" ? 0 : theme.borderRadius === "sm" ? 2 : theme.borderRadius === "md" ? 6 : theme.borderRadius === "lg" ? 8 : theme.borderRadius === "xl" ? 12 : 9999 }} placeholder="Type your answer" />
          <button className="w-full py-2.5 text-white font-medium" style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius === "none" ? 0 : theme.borderRadius === "sm" ? 2 : theme.borderRadius === "md" ? 6 : theme.borderRadius === "lg" ? 8 : theme.borderRadius === "xl" ? 12 : 9999 }}>Submit</button>
        </div>
      </div>
    </div>
  );
}