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
  /**
   * "detalhada" lista cada segmento com seu número — precisa de largura.
   * "resumo" mostra só ocupados/total e joga o detalhe para o title; é a que
   * cabe dentro de uma célula de tabela sem os rótulos se atropelarem.
   */
  legenda?: "detalhada" | "resumo";
}

export function OccupancyBar({
  total,
  segments,
  className,
  legenda = "detalhada",
}: OccupancyBarProps) {
  const ocupados = segments.reduce((soma, s) => soma + s.value, 0);
  const detalhe = segments.map((s) => `${s.label}: ${s.value}`).join(" · ");

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg-surface)]"
        title={legenda === "resumo" ? `${detalhe} · Total: ${total}` : undefined}
      >
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

      {legenda === "resumo" ? (
        <p className="text-xs tabular-nums text-[var(--text-muted)]">
          {ocupados === 0 ? (
            <span>Nenhuma inscrição · {total} vagas</span>
          ) : (
            <span>
              <span className="text-[var(--text-primary)]">{ocupados}</span> de{" "}
              {total} vagas
            </span>
          )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
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
      )}
    </div>
  );
}
