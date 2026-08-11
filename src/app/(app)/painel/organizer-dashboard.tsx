"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Users, CheckCircle } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { OccupancyBar } from "@/components/dashboard/occupancy-bar";
import { TurmaStatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

interface DashboardData {
  metrics: {
    cursosAtivos: number;
    turmasAbertas: number;
    totalInscritos: number;
    taxaConfirmacao: number;
  };
  turmasRecentes: Array<{
    id: string;
    titulo: string;
    dataInicio: string;
    status: string;
    vagasTotais: number;
    inscritos: number;
    confirmados: number;
    filaEspera: number;
  }>;
}

export function OrganizerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard/organizador")
      .then(setData)
      .catch(() => {
        // Fallback mock data for development
        setData({
          metrics: {
            cursosAtivos: 14,
            turmasAbertas: 5,
            totalInscritos: 127,
            taxaConfirmacao: 78,
          },
          turmasRecentes: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div data-tour="metricas" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Cursos Ativos"
          value={metrics?.cursosAtivos ?? 0}
          accentColor="var(--samu-blue)"
          icon={<BookOpen />}
        />
        <MetricsCard
          title="Turmas Abertas"
          value={metrics?.turmasAbertas ?? 0}
          accentColor="var(--status-success)"
          icon={<CalendarDays />}
        />
        <MetricsCard
          title="Total Inscritos"
          value={metrics?.totalInscritos ?? 0}
          accentColor="var(--samu-orange)"
          icon={<Users />}
        />
        {/* 0% sem nenhuma inscrição não é um resultado ruim, é ausência de
            dado — mostrar o número faria alguém agir sobre nada. */}
        <MetricsCard
          title="Taxa Confirmação"
          value={
            metrics && metrics.totalInscritos > 0
              ? `${metrics.taxaConfirmacao}%`
              : "—"
          }
          description={
            metrics && metrics.totalInscritos > 0
              ? undefined
              : "sem inscrições ainda"
          }
          accentColor="var(--status-info)"
          icon={<CheckCircle />}
        />
      </div>

      {/* Turmas ativas */}
      <div data-tour="turmas-ativas" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="font-display text-base font-semibold">
            Turmas Ativas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                <th className="px-5 py-3 font-medium">Turma</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Ocupação</th>
              </tr>
            </thead>
            <tbody>
              {data?.turmasRecentes && data.turmasRecentes.length > 0 ? (
                data.turmasRecentes.map((turma) => (
                  <tr
                    key={turma.id}
                    className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    <td className="px-5 py-3 font-medium">{turma.titulo}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {formatDate(turma.dataInicio)}
                    </td>
                    <td className="px-5 py-3">
                      <TurmaStatusBadge
                        status={turma.status as Parameters<typeof TurmaStatusBadge>[0]["status"]}
                      />
                    </td>
                    <td className="w-56 px-5 py-3">
                      <OccupancyBar
                        legenda="resumo"
                        total={turma.vagasTotais}
                        segments={[
                          {
                            label: "Confirmados",
                            value: turma.confirmados,
                            color: "var(--status-success)",
                          },
                          {
                            label: "Inscritos",
                            value: turma.inscritos,
                            color: "var(--status-info)",
                          },
                          {
                            label: "Fila",
                            value: turma.filaEspera,
                            color: "var(--status-warning)",
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-[var(--text-muted)]"
                  >
                    Nenhuma turma ativa no momento
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
