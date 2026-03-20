"use client";

import { CalendarDays, Clock, CheckCircle } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { EmptyState } from "@/components/shared/empty-state";

export function ProfessionalDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard
          title="Turmas Disponíveis"
          value={0}
          accentColor="var(--status-success)"
          icon={<CalendarDays />}
        />
        <MetricsCard
          title="Minhas Inscrições"
          value={0}
          accentColor="var(--samu-blue)"
          icon={<Clock />}
        />
        <MetricsCard
          title="Concluídos"
          value={0}
          accentColor="var(--samu-orange)"
          icon={<CheckCircle />}
        />
      </div>

      <EmptyState
        icon={<CalendarDays />}
        title="Nenhuma inscrição ativa"
        description="Explore as turmas disponíveis para se inscrever em cursos do NEP."
      />
    </div>
  );
}
