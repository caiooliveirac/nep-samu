"use client";

import { MetricsCard } from "@/components/dashboard/metrics-card";
import { Users, CalendarDays, CheckCircle, UserPlus } from "lucide-react";

export function CoordinatorDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border-l-4 border-l-[var(--samu-orange)] bg-[var(--bg-secondary)] p-5">
        <h2 className="font-display text-lg font-semibold">Minha Unidade</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Dados carregando...
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Profissionais Ativos"
          value={0}
          accentColor="var(--samu-blue)"
          icon={<Users />}
        />
        <MetricsCard
          title="Turmas Elegíveis"
          value={0}
          accentColor="var(--status-success)"
          icon={<CalendarDays />}
        />
        <MetricsCard
          title="Inscritos da Unidade"
          value={0}
          accentColor="var(--samu-orange)"
          icon={<UserPlus />}
        />
        <MetricsCard
          title="Confirmados"
          value={0}
          accentColor="var(--status-info)"
          icon={<CheckCircle />}
        />
      </div>
    </div>
  );
}
