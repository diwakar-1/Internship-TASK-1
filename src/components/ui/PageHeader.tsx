"use client";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6", className)}>
      <div>
        <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="text-sm text-black/45 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<Record<string, unknown>>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-static panel-pad text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-50 to-purple-50 text-brand-600 flex items-center justify-center mx-auto mb-4 animate-float">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-black/45 mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = "brand",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<Record<string, unknown>>;
  trend?: string;
  color?: "brand" | "green" | "purple" | "amber";
}) {
  const colorMap = {
    brand: {
      bg: "bg-brand-50",
      text: "text-brand-600",
      gradient: "linear-gradient(90deg, #6366f1, #a78bfa)",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      gradient: "linear-gradient(90deg, #10b981, #34d399)",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      gradient: "linear-gradient(90deg, #8b5cf6, #c084fc)",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      gradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",
    },
  };
  const c = colorMap[color];

  return (
    <div className="stat-accent panel-static panel-pad" style={{ "--accent-gradient": c.gradient } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.bg, c.text)}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-sm text-black/45 mt-0.5">{label}</div>
    </div>
  );
}