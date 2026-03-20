"use client";

import { cn } from "@/lib/cn";

interface MetricsCardProps {
  title: string;
  value: number | string;
  description?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}

export function MetricsCard({
  title,
  value,
  description,
  accentColor = "var(--samu-blue)",
  icon,
}: MetricsCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5",
      )}
      style={{ borderLeftWidth: "4px", borderLeftColor: accentColor }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {title}
        </p>
        {icon && (
          <div className="text-[var(--text-muted)] [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </div>
        )}
      </div>
      <p
        className="mt-2 text-3xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
      )}
    </div>
  );
}
