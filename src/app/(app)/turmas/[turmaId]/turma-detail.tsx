"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Clock, Users, UserCheck, ListOrdered, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { OccupancyBar } from "@/components/dashboard/occupancy-bar";
import { TurmaStatusBadge, EnrollmentStatusBadge } from "@/components/shared/status-badge";
import { PROFISSAO_LABELS, TURMA_STATUS_LABELS } from "@/lib/enums";
import type { TurmaStatus, EnrollmentStatus } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  turma: {
    id: string;
    titulo: string;
    descricao: string | null;
    dataInicio: string;
    dataFim: string | null;
    horaInicio: string;
    horaFim: string | null;
    local: string | null;
    modalidade: string;
    vagasTotais: number;
    modoCota: string;
    filaEsperaHabilitada: boolean;
    profissoesElegiveis: string[];
    escopoElegibilidade: string;
    status: TurmaStatus;
    prazoConfirmacaoDias: number;
    curso: { id: string; nome: string; cargaHoraria: number | null };
    cotas: Array<{ id: string; limite: number; unidade: { id: string; nome: string } | null }>;
    enrollments: Array<{
      id: string;
      status: EnrollmentStatus;
      posicaoFila: number | null;
      inscritoEm: string | Date;
      confirmadoEm: string | Date | null;
      user: { id: string; nome: string; email: string; profissao: string | null };
      unidade: { id: string; nome: string };
    }>;
  };
  metrics: { inscritos: number; confirmados: number; filaEspera: number };
  userRole: string;
  userId: string;
  myEnrollment: { id: string; status: EnrollmentStatus } | null;
}

export function TurmaDetail({ turma, metrics, userRole, userId, myEnrollment }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isOrganizador = userRole === "ORGANIZADOR";

  const VALID_TRANSITIONS: Record<string, TurmaStatus[]> = {
    RASCUNHO: ["PUBLICADA", "CANCELADA"],
    PUBLICADA: ["INSCRICOES_ABERTAS", "RASCUNHO", "CANCELADA"],
    INSCRICOES_ABERTAS: ["INSCRICOES_ENCERRADAS", "LOTADA", "CANCELADA"],
    LOTADA: ["INSCRICOES_ENCERRADAS", "INSCRICOES_ABERTAS", "CANCELADA"],
    INSCRICOES_ENCERRADAS: ["EM_ANDAMENTO", "CANCELADA"],
    EM_ANDAMENTO: ["CONCLUIDA", "CANCELADA"],
    CONCLUIDA: [],
    CANCELADA: [],
  };

  const nextStatuses = VALID_TRANSITIONS[turma.status] || [];

  async function handleStatusChange(newStatus: TurmaStatus) {
    if (newStatus === "CANCELADA" && !confirm("Tem certeza que deseja cancelar esta turma?")) return;
    setLoading(true);
    try {
      await apiFetch(`/api/turmas/${turma.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Status alterado para ${TURMA_STATUS_LABELS[newStatus]}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status");
    } finally {
      setLoading(false);
    }
  }

  async function handleInscrever() {
    setLoading(true);
    try {
      await apiFetch(`/api/turmas/${turma.id}/inscrever`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadeId: "" }), // será preenchido pelo backend via vínculo
      });
      toast.success("Inscrição realizada com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao inscrever");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmar() {
    setLoading(true);
    try {
      await apiFetch(`/api/turmas/${turma.id}/confirmar`, {
        method: "POST",
      });
      toast.success("Presença confirmada!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar");
    } finally {
      setLoading(false);
    }
  }

  const canEnroll =
    !myEnrollment &&
    (turma.status === "INSCRICOES_ABERTAS" ||
      (turma.status === "LOTADA" && turma.filaEsperaHabilitada));

  const canConfirm =
    myEnrollment &&
    ["INSCRITO", "PROMOVIDO"].includes(myEnrollment.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{turma.curso.nome}</p>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {turma.titulo}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <TurmaStatusBadge status={turma.status} />
            <Badge variant="outline">{turma.modalidade}</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          {isOrganizador && (
            <Link href={`/turmas/${turma.id}/editar`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-3 w-3" />
                Editar
              </Button>
            </Link>
          )}
          {canEnroll && (
            <Button onClick={handleInscrever} disabled={loading}>
              {turma.status === "LOTADA" ? "Entrar na fila" : "Inscrever-se"}
            </Button>
          )}
          {canConfirm && (
            <Button onClick={handleConfirmar} disabled={loading}>
              Confirmar presença
            </Button>
          )}
          {myEnrollment && (
            <EnrollmentStatusBadge status={myEnrollment.status} />
          )}
        </div>
      </div>

      {/* Status management (organizer only) */}
      {isOrganizador && nextStatuses.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-4">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Ações:</span>
            {nextStatuses.filter((s) => s !== "CANCELADA").map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => handleStatusChange(s)}
              >
                {TURMA_STATUS_LABELS[s]}
              </Button>
            ))}
            {nextStatuses.includes("CANCELADA") && (
              <Button
                size="sm"
                variant="destructive"
                disabled={loading}
                onClick={() => handleStatusChange("CANCELADA")}
              >
                Cancelar Turma
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(turma.dataInicio)}{turma.dataFim ? ` — ${formatDate(turma.dataFim)}` : ""}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Clock className="h-4 w-4" />
          <span>{turma.horaInicio}{turma.horaFim ? ` — ${turma.horaFim}` : ""}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <MapPin className="h-4 w-4" />
          <span>{turma.local || "A definir"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Users className="h-4 w-4" />
          <span>{turma.vagasTotais} vagas ({turma.modoCota})</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard
          title="Inscritos"
          value={metrics.inscritos}
          accentColor="var(--status-info)"
          icon={<Users />}
        />
        <MetricsCard
          title="Confirmados"
          value={metrics.confirmados}
          accentColor="var(--status-success)"
          icon={<UserCheck />}
        />
        <MetricsCard
          title="Fila de Espera"
          value={metrics.filaEspera}
          accentColor="var(--status-warning)"
          icon={<ListOrdered />}
        />
      </div>

      {/* Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Ocupação</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyBar
            total={turma.vagasTotais}
            segments={[
              { label: "Confirmados", value: metrics.confirmados, color: "var(--status-success)" },
              { label: "Inscritos", value: metrics.inscritos - metrics.confirmados, color: "var(--status-info)" },
              { label: "Fila de espera", value: metrics.filaEspera, color: "var(--status-warning)" },
            ]}
          />
        </CardContent>
      </Card>

      {/* Elegibilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Elegibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-[var(--text-secondary)]">Profissões: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {turma.profissoesElegiveis.map((p) => (
                <Badge key={p} variant="neutral">
                  {PROFISSAO_LABELS[p as keyof typeof PROFISSAO_LABELS] || p}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)]">
              Escopo: {turma.escopoElegibilidade.replace(/_/g, " ")}
            </span>
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)]">
              Confirmação: {turma.prazoConfirmacaoDias} dias antes
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cotas */}
      {turma.cotas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cotas por {turma.modoCota === "POR_UNIDADE" ? "Unidade" : "Município"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {turma.cotas.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)]">
                    {c.unidade?.nome || "—"}
                  </span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {c.limite} vagas
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de inscritos (organizador/coordenador) */}
      {isOrganizador && turma.enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inscritos ({turma.enrollments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-muted)]">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Profissão</th>
                    <th className="pb-2 font-medium">Unidade</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Data inscrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {turma.enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]">
                      <td className="py-2 text-[var(--text-primary)]">{e.user.nome}</td>
                      <td className="py-2 text-[var(--text-secondary)]">
                        {e.user.profissao
                          ? PROFISSAO_LABELS[e.user.profissao as keyof typeof PROFISSAO_LABELS]
                          : "—"}
                      </td>
                      <td className="py-2 text-[var(--text-secondary)]">{e.unidade.nome}</td>
                      <td className="py-2">
                        <EnrollmentStatusBadge status={e.status} />
                      </td>
                      <td className="py-2 text-[var(--text-muted)]">
                        {formatDate(e.inscritoEm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
