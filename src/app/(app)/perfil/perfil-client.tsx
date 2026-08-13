"use client";

import {
  Award,
  Building2,
  CheckCircle,
  Clock,
  Medal,
  ScrollText,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricsCard } from "@/components/dashboard/metrics-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { PROFISSAO_LABELS, type Profissao, type Role } from "@/lib/enums";
import type {
  PerfilGamificacao,
  RankingResumo,
} from "@/server/services/gamificacao.service";

interface PerfilClientProps {
  usuario: {
    nome: string;
    email: string;
    role: Role;
    profissao: Profissao | null;
    unidades: { nome: string; municipio: string | null }[];
  };
  gamificacao: PerfilGamificacao;
}

const ROLE_LABELS: Record<Role, string> = {
  ORGANIZADOR: "Organizador",
  COORDENADOR: "Coordenador",
  PROFISSIONAL: "Profissional",
};

export function PerfilClient({ usuario, gamificacao }: PerfilClientProps) {
  const { resumo, certificados, emblemas, rankingCategoria, rankingUnidade } =
    gamificacao;
  const categoriaLabel = usuario.profissao
    ? PROFISSAO_LABELS[usuario.profissao]
    : null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do perfil */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--solid-orange)] font-display text-xl font-bold text-white">
            {usuario.nome
              .split(" ")
              .map((parte) => parte[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{usuario.nome}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {usuario.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{ROLE_LABELS[usuario.role]}</Badge>
          {categoriaLabel && <Badge variant="info">{categoriaLabel}</Badge>}
          {usuario.unidades.map((u) => (
            <Badge key={u.nome} variant="outline">
              <Building2 className="mr-1 h-3 w-3" />
              {u.nome}
              {u.municipio ? ` · ${u.municipio}` : ""}
            </Badge>
          ))}
        </div>
      </div>

      {/* Resumo da jornada */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Pontos"
          value={resumo.pontos}
          accentColor="var(--samu-orange)"
          icon={<Star />}
        />
        <MetricsCard
          title="Cursos Concluídos"
          value={resumo.cursosConcluidos}
          accentColor="var(--status-success)"
          icon={<CheckCircle />}
        />
        <MetricsCard
          title="Horas de Curso"
          value={resumo.horasConcluidas}
          accentColor="var(--samu-blue)"
          icon={<Clock />}
        />
        <MetricsCard
          title="Emblemas"
          value={
            resumo.emblemasTotal > 0
              ? `${resumo.emblemasConquistados}/${resumo.emblemasTotal}`
              : 0
          }
          accentColor="var(--solid-promoted)"
          icon={<Medal />}
        />
      </div>

      {/* Certificados datados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[var(--samu-orange)]" />
            Certificados
          </CardTitle>
          <CardDescription>
            Cursos concluídos com presença registrada, na data de encerramento
            da turma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificados.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<ScrollText />}
              title="Nenhum certificado ainda"
              description="Conclua um curso com presença registrada para ganhar seu primeiro certificado."
            />
          ) : (
            <ul className="divide-y divide-[var(--border-default)]">
              {certificados.map((cert) => (
                <li
                  key={cert.enrollmentId}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Award className="h-5 w-5 shrink-0 text-[var(--status-success)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {cert.cursoNome}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {cert.turmaTitulo}
                        {cert.cargaHoraria ? ` · ${cert.cargaHoraria}h` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">
                    {formatDate(cert.dataConclusao)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Emblemas da categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-[var(--solid-promoted)]" />
            Emblemas
          </CardTitle>
          <CardDescription>
            {categoriaLabel
              ? `Um emblema para cada curso disponível à categoria ${categoriaLabel}.`
              : "Os emblemas aparecem para contas com profissão cadastrada."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emblemas.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Medal />}
              title={
                categoriaLabel
                  ? "Nenhum curso ofertado à sua categoria ainda"
                  : "Sem profissão cadastrada"
              }
              description={
                categoriaLabel
                  ? "Quando uma turma elegível à sua profissão for publicada, o emblema do curso aparece aqui."
                  : "Peça a um organizador para registrar sua profissão e participar da gamificação."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {emblemas.map((emblema) => (
                <div
                  key={emblema.cursoId}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-center",
                    emblema.conquistado
                      ? "border-[var(--samu-orange)] bg-[var(--bg-primary)]"
                      : "border-dashed border-[var(--border-default)] opacity-60",
                  )}
                >
                  <Medal
                    className={cn(
                      "h-8 w-8",
                      emblema.conquistado
                        ? "text-[var(--samu-orange)]"
                        : "text-[var(--text-muted)]",
                    )}
                  />
                  <p className="text-xs font-medium leading-tight">
                    {emblema.cursoNome}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {emblema.conquistado && emblema.dataConquista
                      ? formatDate(emblema.dataConquista)
                      : emblema.cargaHoraria
                        ? `${emblema.cargaHoraria}h`
                        : "A conquistar"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rankings — só entre a mesma categoria */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankingCard
          titulo="Ranking da Categoria"
          descricao={
            categoriaLabel
              ? `Todos os profissionais ${categoriaLabel}, de qualquer unidade.`
              : "Disponível para contas com profissão cadastrada."
          }
          icone={<Trophy className="h-5 w-5 text-[var(--samu-orange)]" />}
          ranking={rankingCategoria}
        />
        <RankingCard
          titulo={
            rankingUnidade
              ? `Ranking em ${rankingUnidade.unidadeNome}`
              : "Ranking da Unidade"
          }
          descricao={
            categoriaLabel
              ? `Só os ${categoriaLabel} da sua unidade.`
              : "Disponível para contas com profissão cadastrada."
          }
          icone={<Users className="h-5 w-5 text-[var(--samu-blue)]" />}
          ranking={rankingUnidade}
          vazioDescricao="Você precisa de um vínculo ativo com uma unidade para ver este ranking."
        />
      </div>
    </div>
  );
}

function RankingCard({
  titulo,
  descricao,
  icone,
  ranking,
  vazioDescricao,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  ranking: RankingResumo | null;
  vazioDescricao?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icone}
          {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {!ranking ? (
          <EmptyState
            className="py-8"
            icon={<Trophy />}
            title="Ranking indisponível"
            description={
              vazioDescricao ??
              "Peça a um organizador para registrar sua profissão e entrar na competição."
            }
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Sua posição:{" "}
              <span
                className="font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {ranking.posicao}º
              </span>{" "}
              de {ranking.totalParticipantes}
            </p>
            <ol className="space-y-1">
              {ranking.top.map((linha, indice) => (
                <li
                  key={linha.userId}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                    linha.isUsuario
                      ? "bg-[var(--samu-orange)]/10 font-semibold"
                      : "odd:bg-[var(--bg-primary)]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "w-7 shrink-0 text-right",
                        indice < 3
                          ? "font-bold text-[var(--samu-orange)]"
                          : "text-[var(--text-muted)]",
                      )}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {indice + 1}º
                    </span>
                    <span className="truncate">
                      {linha.nome}
                      {linha.isUsuario ? " (você)" : ""}
                    </span>
                  </div>
                  <span
                    className="shrink-0 text-[var(--text-secondary)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {linha.pontos} pts
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
