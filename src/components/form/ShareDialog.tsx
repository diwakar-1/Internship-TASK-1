"use client";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "./QRCodeCanvas";
import { Copy, Check, Link as LinkIcon, Code, QrCode, Download } from "lucide-react";
import type { Form } from "@/types";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface ShareDialogProps {
  form: Form;
  inline?: boolean;
}

export function ShareDialog({ form, inline }: ShareDialogProps) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const formUrl = `${baseUrl}/forms/${form.id}`;
  const embedCode = `<iframe src="${formUrl}?embed=1" width="100%" height="800" style="border:0; border-radius: 8px" loading="lazy"></iframe>`;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast.error("Failed to copy");
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById("share-qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  if (form.status !== "published") {
    return (
      <div className={inline ? "" : "panel panel-pad text-center"}>
        <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <strong>This form is not published yet.</strong> Publish it first to share with respondents.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Share your form</h3>
        <p className="text-sm text-black/45 mb-4">Anyone with the link can fill out your form.</p>

        <div className="space-y-3">
          <div>
            <label className="label flex items-center gap-1.5"><LinkIcon size={14} strokeWidth={2} /> Direct link</label>
            <div className="flex gap-2">
              <input readOnly value={formUrl} className="input flex-1" />
              <button onClick={() => copy("link", formUrl)} className="btn-secondary">
                {copied === "link" ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">QR Code</h3>
        <p className="text-sm text-black/45 mb-4">Scan with a phone camera to open the form.</p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="p-4 bg-white border border-black/5 rounded-xl">
            <QRCodeCanvas id="share-qr-canvas" value={formUrl} size={160} fgColor={form.theme.primaryColor} />
          </div>
          <div className="flex-1">
            <button onClick={downloadQR} className="btn-secondary mb-2">
              <Download size={16} strokeWidth={2} /> Download PNG
            </button>
            <p className="text-xs text-black/45">Perfect for printing on flyers, posters, or business cards.</p>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Embed on your website</h3>
        <p className="text-sm text-black/45 mb-4">Paste this code into your website's HTML to embed the form.</p>
        <div className="relative">
          <textarea readOnly value={embedCode} className="input font-mono text-xs h-24" />
          <button onClick={() => copy("embed", embedCode)} className="absolute top-2 right-2 btn-secondary text-xs">
            {copied === "embed" ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="font-semibold text-ink-900 mb-1">Access controls</h3>
        <p className="text-sm text-black/45 mb-3">Configure who can submit responses.</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 bg-[#f4f1f8] rounded-xl">
            <span>Form status</span>
            <span className="chip bg-green-50 text-green-700">● Live & accepting responses</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#f4f1f8] rounded-xl">
            <span>Password protection</span>
            <span className="chip bg-black/5 text-black/60">{form.settings.passwordProtected ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#f4f1f8] rounded-xl">
            <span>Multiple submissions</span>
            <span className="chip bg-black/5 text-black/60">{form.settings.allowMultipleSubmissions ? "Allowed" : "One per user"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}