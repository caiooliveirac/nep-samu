"use client";

import { TurmaStatus, EnrollmentStatus } from "@/lib/enums";
import {
  TURMA_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
} from "@/lib/enums";
import { Badge } from "@/components/ui/badge";

const turmaStatusVariant: Record<
  TurmaStatus,
  "default" | "success" | "warning" | "danger" | "info" | "neutral" | "orange"
> = {
  RASCUNHO: "neutral",
  PUBLICADA: "info",
  INSCRICOES_ABERTAS: "success",
  LOTADA: "warning",
  INSCRICOES_ENCERRADAS: "orange",
  EM_ANDAMENTO: "default",
  CONCLUIDA: "success",
  CANCELADA: "danger",
};

const enrollmentStatusVariant: Record<
  EnrollmentStatus,
  "default" | "success" | "warning" | "danger" | "info" | "neutral" | "promoted"
> = {
  INSCRITO: "info",
  FILA_ESPERA: "warning",
  PROMOVIDO: "promoted",
  CONFIRMADO: "success",
  CANCELADO: "danger",
  CANCELADO_NAO_CONFIRMOU: "danger",
  PRESENTE: "success",
  AUSENTE: "danger",
};

export function TurmaStatusBadge({ status }: { status: TurmaStatus }) {
  return (
    <Badge variant={turmaStatusVariant[status]}>
      {TURMA_STATUS_LABELS[status]}
    </Badge>
  );
}

export function EnrollmentStatusBadge({
  status,
}: {
  status: EnrollmentStatus;
}) {
  return (
    <Badge variant={enrollmentStatusVariant[status]}>
      {ENROLLMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
