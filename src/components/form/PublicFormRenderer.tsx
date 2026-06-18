"use client";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Check, Star, Upload, ChevronDown, Calendar, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormField, FormTheme, FormSettings, FormResponse } from "@/types";
import { uploadFile } from "@/lib/firebase";

const isImage = (url: string) => {
  if (url.startsWith("data:image/")) return true;
  const cleanUrl = url.split("?")[0];
  const ext = cleanUrl.split(".").pop()?.toLowerCase();
  return ext ? ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) : false;
};

const isPdf = (url: string) => {
  if (url.startsWith("data:application/pdf")) return true;
  const cleanUrl = url.split("?")[0];
  const ext = cleanUrl.split(".").pop()?.toLowerCase();
  return ext === "pdf";
};

interface PublicFormRendererProps {
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  preview?: boolean;
}

const buildSchema = (fields: FormField[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    let schema: z.ZodTypeAny;
    switch (f.type) {
      case "email":
        schema = z.string().email("Please enter a valid email");
        break;
      case "number":
      case "rating":
        schema = z.coerce.number();
        if (f.validation.min !== undefined) schema = (schema as z.ZodNumber).min(f.validation.min);
        if (f.validation.max !== undefined) schema = (schema as z.ZodNumber).max(f.validation.max);
        break;
      case "url":
        schema = z.string().url("Please enter a valid URL");
        break;
      case "phone":
        schema = z.string().regex(/^[+0-9\s\-()]{7,}$/, "Please enter a valid phone number").optional().or(z.literal(""));
        break;
      case "checkbox":
        schema = z.array(z.string());
        break;
      case "date":
        schema = z.string();
        break;
      case "signature":
        schema = z.string().optional().or(z.literal(""));
        break;
      case "file":
        schema = z.any();
        break;
      default:
        schema = z.string();
        if (f.validation.minLength) schema = (schema as z.ZodString).min(f.validation.minLength, `Minimum ${f.validation.minLength} characters`);
        if (f.validation.maxLength) schema = (schema as z.ZodString).max(f.validation.maxLength, `Maximum ${f.validation.maxLength} characters`);
        if (f.validation.pattern) {
          try {
            const re = new RegExp(f.validation.pattern);
            schema = (schema as z.ZodString).regex(re, f.validation.patternMessage || "Invalid format");
          } catch {
            /* ignore bad regex */
          }
        }
    }
    if (!f.validation.required) {
      if (f.type === "file") {
        shape[f.id] = z.any().optional();
      } else {
        shape[f.id] = schema.optional().or(z.literal("")).or(z.array(z.string()).optional());
      }
    } else {
      if (f.type === "checkbox") {
        shape[f.id] = z.array(z.string()).min(1, "Please select at least one option");
      } else if (f.type === "signature") {
        shape[f.id] = schema.refine((v) => typeof v === "string" && v.startsWith("data:image/"), { message: "Signature is required" });
      } else if (f.type === "file") {
        shape[f.id] = z.any().refine((v) => {
          if (v instanceof FileList && v.length > 0) return true;
          if (v instanceof File) return true;
          if (typeof v === "string" && v) return true;
          return false;
        }, { message: "File is required" });
      } else {
        shape[f.id] = schema.refine((v) => v !== "" && v !== undefined && v !== null, { message: "This field is required" });
      }
    }
  });
  return z.object(shape);
};

export function PublicFormRenderer({ fields, theme, settings, initialData, onSubmit, preview }: PublicFormRendererProps) {
  const schema = buildSchema(fields);
  type FormData = Record<string, unknown>;
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: initialData as FormData,
  });

  const submit = async (data: FormData) => {
    if (preview) return;
    setSubmitting(true);
    setError("");
    const startTime = (window as unknown as { __formStart?: number }).__formStart ?? Date.now();
    const completionTimeMs = Date.now() - startTime;
    try {
      const mapped: Record<string, unknown> = {};
      await Promise.all(
        fields.map(async (f) => {
          const val = data[f.id];
          if (f.type === "file") {
            if (val instanceof FileList && val.length > 0) {
              const file = val[0];
              mapped[f.label] = await uploadFile(file);
            } else if (val instanceof File) {
              mapped[f.label] = await uploadFile(val);
            } else {
              mapped[f.label] = "";
            }
          } else {
            mapped[f.label] = val;
          }
        })
      );
      await onSubmit(mapped);
      setSubmitted(true);
      if (settings.redirectUrl) {
        setTimeout(() => { window.location.href = settings.redirectUrl!; }, 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
      void completionTimeMs;
    }
  };

  if (typeof window !== "undefined" && !preview && !(window as unknown as { __formStart?: number }).__formStart) {
    (window as unknown as { __formStart?: number }).__formStart = Date.now();
  }

  if (submitted) {
    return (
      <div className="rounded-2xl p-8 text-center max-w-2xl mx-auto animate-fade-in panel" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primaryColor + "20" }}>
          <Check size={28} style={{ color: theme.primaryColor }} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-semibold">Submitted!</h2>
        <p className="mt-2 opacity-80">{settings.successMessage}</p>
        {settings.redirectUrl && <p className="mt-2 text-sm opacity-60">Redirecting...</p>}
      </div>
    );
  }

  const radiusClass = { none: "rounded-none", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" }[theme.borderRadius];

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className={cn("space-y-5 max-w-2xl mx-auto")}
      style={{ color: theme.textColor, fontFamily: theme.fontFamily }}
    >
      {fields.map((field, idx) => (
        <div key={field.id}>
          <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textColor }}>
            {field.label}
            {field.validation.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.helpText && <p className="text-xs mb-2 opacity-60">{field.helpText}</p>}
          {renderField(field, register, setValue, watch, theme, radiusClass, errors[field.id]?.message as string | undefined)}
          {errors[field.id] && (
            <p className="text-xs text-red-500 mt-1">{errors[field.id]?.message as string}</p>
          )}
          {settings.showProgressBar && (
            <div className="mt-1.5 text-xs opacity-50">Step {idx + 1} of {fields.length}</div>
          )}
        </div>
      ))}

      {error && <div className="text-sm text-red-500 p-3 bg-red-50 rounded-xl">{error}</div>}

      <button
        type="submit"
        disabled={submitting || preview}
        className={cn("w-full py-3 font-medium text-white transition disabled:opacity-50", radiusClass)}
        style={{ backgroundColor: theme.primaryColor }}
      >
        {submitting ? "Submitting..." : settings.submitButtonText}
      </button>

      {theme.showBranding && (
        <p className="text-center text-xs opacity-40">Powered by FormCraft</p>
      )}
    </form>
  );
}

function SignaturePad({
  value,
  onChange,
  theme,
  radiusClass,
  error,
}: {
  value?: string;
  onChange: (val: string) => void;
  theme: FormTheme;
  radiusClass: string;
  error?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = theme.textColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value, theme.textColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onChange(canvas.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange("");
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  return (
    <div className="relative border bg-white rounded-xl overflow-hidden" style={{ borderColor: error ? "#ef4444" : theme.textColor + "30" }}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-32 cursor-crosshair touch-none"
      />
      {hasSignature && (
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 px-2 py-1 bg-white hover:bg-black/[0.02] text-ink-900 text-xs font-medium rounded-full border border-black/10 shadow-sm transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function renderField(
  field: FormField,
  register: ReturnType<typeof useForm>["register"],
  setValue: ReturnType<typeof useForm>["setValue"],
  watch: ReturnType<typeof useForm>["watch"],
  theme: FormTheme,
  radiusClass: string,
  error?: string
) {
  const inputStyle: React.CSSProperties = {
    borderColor: error ? "#ef4444" : theme.textColor + "30",
    backgroundColor: "transparent",
    color: theme.textColor,
  };
  const reg = register(field.id);

  switch (field.type) {
    case "textarea":
      return <textarea {...reg} placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} rows={4} />;
    case "number":
      return <input {...reg} type="number" placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
    case "email":
      return <input {...reg} type="email" placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
    case "phone":
      return <input {...reg} type="tel" placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
    case "url":
      return <input {...reg} type="url" placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
    case "date":
      return <input {...reg} type="date" className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
    case "dropdown":
      return (
        <div className="relative">
          <select {...reg} className={cn("w-full px-3 py-2 border outline-none focus:ring-2 appearance-none pr-10", radiusClass)} style={inputStyle}>
            <option value="">-- Select --</option>
            {field.options?.map((o) => (
              <option key={o.id} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" strokeWidth={1.8} />
        </div>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {field.options?.map((o) => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer">
              <input {...reg} type="radio" value={o.value} className="w-4 h-4" style={{ accentColor: theme.primaryColor }} />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      );
    case "checkbox": {
      const current = (watch(field.id) as string[]) || [];
      return (
        <div className="space-y-2">
          {field.options?.map((o) => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={current.includes(o.value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...current, o.value]
                    : current.filter((v) => v !== o.value);
                  setValue(field.id, next, { shouldValidate: true });
                }}
                className="w-4 h-4"
                style={{ accentColor: theme.primaryColor }}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      );
    }
    case "rating": {
      const val = Number(watch(field.id) || 0);
      const max = field.validation.max ?? 5;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setValue(field.id, i + 1, { shouldValidate: true })}
              className="p-1 transition"
            >
              <Star size={28} className={i < val ? "fill-current" : ""} strokeWidth={1.8} style={{ color: i < val ? theme.primaryColor : theme.textColor + "40" }} />
            </button>
          ))}
        </div>
      );
    }
    case "file": {
      const fileVal = watch(field.id);
      let fileName = "";
      let previewUrl = "";
      if (fileVal instanceof FileList && fileVal.length > 0) {
        const file = fileVal[0];
        fileName = file.name;
        if (file.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(file);
        }
      } else if (fileVal instanceof File) {
        fileName = fileVal.name;
        if (fileVal.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(fileVal);
        }
      } else if (typeof fileVal === "string" && fileVal) {
        fileName = fileVal.split("/").pop() || "Uploaded File";
        if (fileVal.startsWith("data:image/") || isImage(fileVal)) {
          previewUrl = fileVal;
        }
      }

      return (
        <label className={cn("flex flex-col items-center justify-center gap-2.5 p-6 border-2 border-dashed cursor-pointer hover:bg-black/[0.02] rounded-xl transition-all duration-300", radiusClass)} style={inputStyle}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="max-h-24 rounded-lg object-contain mb-1 shadow-sm border border-black/5 bg-white p-1" />
          ) : (
            <Upload size={20} className={cn("opacity-50", fileName && "text-brand-600 opacity-100")} strokeWidth={1.8} />
          )}
          {fileName ? (
            <div className="text-center">
              <span className="text-sm font-semibold text-brand-700 block truncate max-w-xs">{fileName}</span>
              <span className="text-[10px] text-black/45 block mt-0.5">Click to change file</span>
            </div>
          ) : (
            <span className="text-sm opacity-70">Click to upload or drag and drop</span>
          )}
          <input {...reg} type="file" className="hidden" />
        </label>
      );
    }
    case "signature": {
      const val = watch(field.id) as string | undefined;
      return (
        <SignaturePad
          value={val}
          onChange={(newVal) => setValue(field.id, newVal, { shouldValidate: true })}
          theme={theme}
          radiusClass={radiusClass}
          error={!!error}
        />
      );
    }
    default:
      return <input {...reg} type="text" placeholder={field.placeholder} className={cn("w-full px-3 py-2 border outline-none focus:ring-2", radiusClass)} style={inputStyle} />;
  }
}

export function FormResponseView({ response, fields }: { response: FormResponse; fields: FormField[] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const v = response.data[f.label];
        return (
          <div key={f.id} className="border-b border-black/5 pb-3 last:border-0">
            <div className="text-xs font-medium text-black/45 uppercase tracking-wide">{f.label}</div>
            <div className="mt-1 text-sm text-ink-900">
              {f.type === "signature" && typeof v === "string" && v.startsWith("data:image/") ? (
                <img src={v} alt="Signature" className="max-h-20 border border-black/5 rounded-xl p-1 bg-white" />
              ) : f.type === "file" && typeof v === "string" && v ? (
                <div className="mt-2 space-y-3">
                  {/* File Info Box */}
                  <div className="p-3 bg-black/[0.02] border border-black/5 rounded-2xl flex items-center justify-between gap-4 max-w-md shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                        <Upload size={16} className="text-black/60" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-black block truncate" title={v.split("/").pop()?.replace(/^\d+_/, "")}>
                          {v.split("/").pop()?.replace(/^\d+_/, "") || "Uploaded File"}
                        </span>
                        <span className="text-[10px] text-black/40 block mt-0.5 uppercase font-bold tracking-wider">
                          {v.split(".").pop()?.toUpperCase() || "File"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition"
                        title="Open in new tab"
                      >
                        <Eye size={14} />
                      </a>
                      <a
                        href={v}
                        download={v.split("/").pop()?.replace(/^\d+_/, "") || "document"}
                        className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition"
                        title="Download file"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Inline Preview (Images, PDFs, or Text) */}
                  {(isImage(v) || isPdf(v) || v.endsWith(".txt")) && (
                    <div className="border border-black/5 rounded-2xl overflow-hidden bg-white shadow-sm max-w-md">
                      <div className="px-3 py-1.5 bg-[#fcfbfa]/80 border-b border-black/5 text-[10px] font-bold text-black/45 uppercase tracking-wider">
                        Document Preview
                      </div>
                      <div className="p-2 flex justify-center items-center bg-slate-50/50">
                        {isImage(v) ? (
                          <img src={v} alt="Uploaded Document Preview" className="max-h-60 rounded-xl object-contain shadow-sm border border-black/5 bg-white p-1" />
                        ) : isPdf(v) ? (
                          <iframe src={v} className="w-full h-80 rounded-xl border border-transparent bg-white" title="PDF preview" />
                        ) : v.endsWith(".txt") ? (
                          <iframe src={v} className="w-full h-48 rounded-xl border border-transparent bg-white text-xs p-2 font-mono" title="Text preview" />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : Array.isArray(v) ? (
                v.join(", ") || <em className="text-black/30">—</em>
              ) : v ? (
                String(v)
              ) : (
                <em className="text-black/30">—</em>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { format, Calendar };