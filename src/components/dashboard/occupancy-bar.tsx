"use client";

import { cn } from "@/lib/cn";

interface OccupancySegment {
  label: string;
  value: number;
  color: string;
}

interface OccupancyBarProps {
  total: number;
  segments: OccupancySegment[];
  className?: string;
}

export function OccupancyBar({ total, segments, className }: OccupancyBarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg-surface)]">
        {segments.map((segment) => {
          const pct = total > 0 ? (segment.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={segment.label}
              className="transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: segment.color,
              }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-[var(--text-muted)]">
        {segments.map((segment) => (
          <span key={segment.label} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            {segment.label}: {segment.value}
          </span>
        ))}
        <span className="ml-auto">Total: {total}</span>
      </div>
    </div>
  );
}
