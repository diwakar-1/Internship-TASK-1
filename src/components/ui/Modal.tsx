"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children, size = "md", footer }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      {/* Backdrop with gradient */}
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-md" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-white rounded-2xl border border-black/5 shadow-xl animate-slide-up relative",
          sizes[size]
        )}
        style={{ boxShadow: "0 24px 80px rgba(11, 11, 20, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)" }}
      >
        <div className="flex items-start justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description && <p className="text-sm text-black/45 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="text-black/40 hover:text-black/70 p-1 rounded-lg hover:bg-black/[0.04] transition">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto scrollbar-thin">{children}</div>
        {footer && (
          <div className="p-5 border-t border-black/5 bg-gradient-to-r from-[#f4f1f8] to-brand-50/30 rounded-b-2xl flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={destructive ? "btn-danger" : "btn-primary"}>
            {confirmText}
          </button>
        </>
      }
    >
      <></>
    </Modal>
  );
}