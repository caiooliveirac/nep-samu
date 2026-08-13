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
import {
  COTA_MODO_LABELS,
  ESCOPO_ELEGIBILIDADE_LABELS,
  PROFISSAO_LABELS,
  TURMA_STATUS_LABELS,
} from "@/lib/enums";
import type {
  CotaModo,
  EnrollmentStatus,
  EscopoElegibilidade,
  TurmaStatus,
} from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { ListaInscritos } from "@/components/turma/lista-inscritos";
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
    publicoExterno: string | null;
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

  /*
   * Os botões mostravam o nome do estado de destino — "Publicada",
   * "Inscrições Abertas" — que é rótulo, não ação: quem organiza não sabia se
   * aquilo dizia em que estado a turma está ou o que o clique faria. Aqui cada
   * transição ganha o verbo e a consequência.
   */
  const ACOES: Record<string, { rotulo: string; efeito: string; confirmar?: string }> = {
    PUBLICADA: {
      rotulo: "Publicar turma",
      efeito: "A turma fica visível para os profissionais, mas ainda sem inscrição.",
    },
    RASCUNHO: {
      rotulo: "Voltar para rascunho",
      efeito: "A turma sai da vista dos profissionais e volta a ser editável como rascunho.",
    },
    INSCRICOES_ABERTAS: {
      rotulo: "Abrir inscrições",
      efeito: "Os profissionais passam a poder se inscrever nesta turma.",
    },
    LOTADA: {
      rotulo: "Marcar como lotada",
      efeito: "Novas pessoas entram em fila de espera em vez de vaga.",
    },
    INSCRICOES_ENCERRADAS: {
      rotulo: "Encerrar inscrições",
      efeito: "Ninguém mais consegue se inscrever. A lista atual é mantida.",
      confirmar: "Encerrar as inscrições desta turma? Ninguém mais poderá se inscrever.",
    },
    EM_ANDAMENTO: {
      rotulo: "Iniciar turma",
      efeito: "Marca que a turma começou e libera o registro de presença.",
    },
    CONCLUIDA: {
      rotulo: "Concluir turma",
      efeito: "Encerra a turma de vez. Depois disso ela não muda mais de estado.",
      confirmar: "Concluir esta turma? Depois de concluída ela não pode mais mudar de estado.",
    },
    CANCELADA: {
      rotulo: "Cancelar turma",
      efeito: "Cancela a turma para todo mundo. Não dá para desfazer.",
      confirmar: "Cancelar esta turma? Ela é cancelada para todos os inscritos e isso não pode ser desfeito.",
    },
  };

  async function handleStatusChange(newStatus: TurmaStatus) {
    const acao = ACOES[newStatus];
    if (acao?.confirmar && !confirm(acao.confirmar)) return;
    setLoading(true);
    try {
      await apiFetch(`/api/turmas/${turma.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(acao ? `${acao.rotulo}: feito.` : "Turma atualizada.");
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
        // O servidor resolve a unidade pelo vínculo ativo da pessoa.
        body: JSON.stringify({}),
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
              <Button variant="outline">
                <Pencil />
                Editar turma
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
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              O que você pode fazer com esta turma agora
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses
                .filter((s) => s !== "CANCELADA")
                .map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    disabled={loading}
                    title={ACOES[s]?.efeito}
                    onClick={() => handleStatusChange(s)}
                  >
                    {ACOES[s]?.rotulo ?? TURMA_STATUS_LABELS[s]}
                  </Button>
                ))}
              {nextStatuses.includes("CANCELADA") && (
                <Button
                  variant="destructive"
                  disabled={loading}
                  title={ACOES.CANCELADA.efeito}
                  onClick={() => handleStatusChange("CANCELADA")}
                >
                  {ACOES.CANCELADA.rotulo}
                </Button>
              )}
            </div>
            {/* O botão diz o verbo; a linha abaixo diz o que muda de verdade. */}
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              {nextStatuses.map((s) => (
                <li key={s}>
                  <span className="text-[var(--text-secondary)]">
                    {ACOES[s]?.rotulo ?? TURMA_STATUS_LABELS[s]}
                  </span>{" "}
                  — {ACOES[s]?.efeito}
                </li>
              ))}
            </ul>
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
          <span>
            {turma.vagasTotais} vagas,{" "}
            {COTA_MODO_LABELS[turma.modoCota as CotaModo] ?? turma.modoCota}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard
          title="Ocupando vaga"
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
            // A fila não entra na barra: quem está nela não ocupa vaga, e
            // somá-la fazia "6 de 30" numa turma com 5 vagas tomadas.
            segments={[
              { label: "Confirmados", value: metrics.confirmados, color: "var(--status-success)" },
              { label: "Aguardando confirmação", value: metrics.inscritos - metrics.confirmados, color: "var(--status-info)" },
            ]}
          />
          {metrics.filaEspera > 0 && (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Além dessas, {metrics.filaEspera} pessoa(s) na fila de espera —
              elas entram se alguém liberar a vaga.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Elegibilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Elegibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {turma.publicoExterno && (
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
              <p className="text-sm font-medium">Turma para público externo</p>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                {turma.publicoExterno} — não aparece para os profissionais do
                SAMU.
              </p>
            </div>
          )}
          <div>
            <span className="text-sm text-[var(--text-secondary)]">Profissões: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {turma.profissoesElegiveis.length === 0 && (
                <span className="text-sm text-[var(--text-muted)]">
                  nenhuma — turma de público externo
                </span>
              )}
              {turma.profissoesElegiveis.map((p) => (
                <Badge key={p} variant="neutral">
                  {PROFISSAO_LABELS[p as keyof typeof PROFISSAO_LABELS] || p}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-[var(--text-secondary)]">
              Quem pode se inscrever:{" "}
              {ESCOPO_ELEGIBILIDADE_LABELS[
                turma.escopoElegibilidade as EscopoElegibilidade
              ] ?? turma.escopoElegibilidade}
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

      {isOrganizador && (
        <ListaInscritos
          turmaId={turma.id}
          statusTurma={turma.status}
          inscritos={turma.enrollments}
          // A API de presença existe desde sempre e não tinha botão nenhum.
          podeRegistrarPresenca={
            turma.status === "EM_ANDAMENTO" || turma.status === "CONCLUIDA"
          }
        />
      )}
    </div>
  );
}
