import { db } from "@/server/db";
import { enrollments, turmas, users, vinculos } from "@/server/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NotFoundError } from "@/server/lib/errors";

// ═══════════════════════════════════════════
// Regras iniciais de pontuação (estrutura de partida da gamificação).
// Um curso só pontua uma vez por pessoa, mesmo que ela conclua duas turmas
// dele — o emblema é do curso, não da turma, e os pontos seguem o emblema.
// ═══════════════════════════════════════════
const PONTOS_BASE_POR_CURSO = 10;
const PONTOS_POR_HORA = 1;

export interface CertificadoResumo {
  enrollmentId: string;
  cursoId: string;
  cursoNome: string;
  turmaTitulo: string;
  cargaHoraria: number | null;
  /** Data de conclusão da turma (dataFim; cai para dataInicio em turma de um dia). */
  dataConclusao: string;
}

export interface EmblemaResumo {
  cursoId: string;
  cursoNome: string;
  cargaHoraria: number | null;
  conquistado: boolean;
  dataConquista: string | null;
}

export interface RankingLinha {
  userId: string;
  nome: string;
  pontos: number;
  cursosConcluidos: number;
  isUsuario: boolean;
}

export interface RankingResumo {
  posicao: number;
  totalParticipantes: number;
  top: RankingLinha[];
}

export interface PerfilGamificacao {
  resumo: {
    pontos: number;
    cursosConcluidos: number;
    horasConcluidas: number;
    emblemasConquistados: number;
    emblemasTotal: number;
  };
  certificados: CertificadoResumo[];
  emblemas: EmblemaResumo[];
  /** Competição só entre quem tem a mesma profissão, de qualquer unidade. */
  rankingCategoria: RankingResumo | null;
  /** Recorte da mesma competição dentro da unidade ativa do usuário. */
  rankingUnidade: (RankingResumo & { unidadeNome: string }) | null;
}

const TAMANHO_TOP_RANKING = 10;

/**
 * Conclusão = presença registrada numa turma que terminou. Não existe (ainda)
 * tabela de certificados: o certificado datado é derivado desse par, então
 * qualquer ajuste de presença já se reflete aqui sem sincronização.
 */
function concluiu(e: { status: string; presente: boolean | null }): boolean {
  return e.status === "PRESENTE" || e.presente === true;
}

function pontosDoCurso(cargaHoraria: number | null): number {
  return PONTOS_BASE_POR_CURSO + (cargaHoraria ?? 0) * PONTOS_POR_HORA;
}

/** Conclusões de vários usuários, deduplicadas por curso (a primeira vale). */
async function conclusoesPorUsuario(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Map<string, number>>();

  const rows = await db
    .select({
      userId: enrollments.userId,
      cursoId: turmas.cursoId,
    })
    .from(enrollments)
    .innerJoin(turmas, eq(turmas.id, enrollments.turmaId))
    .where(
      and(
        inArray(enrollments.userId, userIds),
        eq(turmas.status, "CONCLUIDA"),
        or(eq(enrollments.status, "PRESENTE"), eq(enrollments.presente, true)),
      ),
    );

  // userId -> (cursoId -> pontos). A carga horária vem numa segunda consulta
  // enxuta aos cursos envolvidos, para não arrastar o join triplo.
  const cursoIds = [...new Set(rows.map((r) => r.cursoId))];
  const cargas = new Map<string, number | null>();
  if (cursoIds.length > 0) {
    const cursosRows = await db.query.cursos.findMany({
      where: (c, { inArray: dentroDe }) => dentroDe(c.id, cursoIds),
      columns: { id: true, cargaHoraria: true },
    });
    for (const c of cursosRows) cargas.set(c.id, c.cargaHoraria);
  }

  const porUsuario = new Map<string, Map<string, number>>();
  for (const r of rows) {
    let cursosDoUsuario = porUsuario.get(r.userId);
    if (!cursosDoUsuario) {
      cursosDoUsuario = new Map();
      porUsuario.set(r.userId, cursosDoUsuario);
    }
    if (!cursosDoUsuario.has(r.cursoId)) {
      cursosDoUsuario.set(r.cursoId, pontosDoCurso(cargas.get(r.cursoId) ?? null));
    }
  }
  return porUsuario;
}

function montarRanking(
  participantes: { id: string; nome: string }[],
  conclusoes: Map<string, Map<string, number>>,
  usuarioId: string,
): RankingResumo {
  const linhas = participantes
    .map((p) => {
      const cursosDoUsuario = conclusoes.get(p.id);
      const pontos = cursosDoUsuario
        ? [...cursosDoUsuario.values()].reduce((soma, v) => soma + v, 0)
        : 0;
      return {
        userId: p.id,
        nome: p.nome,
        pontos,
        cursosConcluidos: cursosDoUsuario?.size ?? 0,
        isUsuario: p.id === usuarioId,
      };
    })
    // Desempate por nome mantém a ordem estável entre recarregamentos.
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.cursosConcluidos - a.cursosConcluidos ||
        a.nome.localeCompare(b.nome),
    );

  const posicao = linhas.findIndex((l) => l.isUsuario) + 1;
  return {
    posicao,
    totalParticipantes: linhas.length,
    top: linhas.slice(0, TAMANHO_TOP_RANKING),
  };
}

export async function getPerfilGamificacao(
  userId: string,
): Promise<PerfilGamificacao> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, nome: true, profissao: true },
    with: {
      vinculos: {
        where: eq(vinculos.status, "ATIVO"),
        orderBy: [desc(vinculos.updatedAt)],
        with: { unidade: true },
      },
    },
  });
  if (!user) throw new NotFoundError("Usuário");

  // ── Certificados: conclusões do próprio usuário, datadas pela turma ──
  const minhasInscricoes = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, userId),
    with: { turma: { with: { curso: true } } },
  });

  const conclusoesMinhas = minhasInscricoes.filter(
    (e) => e.turma.status === "CONCLUIDA" && concluiu(e),
  );

  const certificados: CertificadoResumo[] = conclusoesMinhas
    .map((e) => ({
      enrollmentId: e.id,
      cursoId: e.turma.curso.id,
      cursoNome: e.turma.curso.nome,
      turmaTitulo: e.turma.titulo,
      cargaHoraria: e.turma.curso.cargaHoraria,
      dataConclusao: e.turma.dataFim ?? e.turma.dataInicio,
    }))
    .sort((a, b) => b.dataConclusao.localeCompare(a.dataConclusao));

  // Primeira conclusão de cada curso: data do emblema e base dos pontos.
  const primeiraConclusaoPorCurso = new Map<string, CertificadoResumo>();
  for (const cert of [...certificados].reverse()) {
    if (!primeiraConclusaoPorCurso.has(cert.cursoId)) {
      primeiraConclusaoPorCurso.set(cert.cursoId, cert);
    }
  }

  // ── Emblemas: um por curso disponível à categoria (profissão) do usuário ──
  // "Disponível" = curso ativo que já ofereceu ao menos uma turma visível
  // elegível à profissão dele. A elegibilidade mora na turma, não no curso.
  let emblemas: EmblemaResumo[] = [];
  if (user.profissao) {
    const turmasVisiveis = await db.query.turmas.findMany({
      where: (t, { notInArray }) =>
        notInArray(t.status, ["RASCUNHO", "CANCELADA"]),
      columns: { id: true, profissoesElegiveis: true },
      with: { curso: true },
    });

    const cursosDaCategoria = new Map<
      string,
      { id: string; nome: string; cargaHoraria: number | null }
    >();
    for (const t of turmasVisiveis) {
      if (!t.curso.ativo) continue;
      if (!t.profissoesElegiveis.includes(user.profissao)) continue;
      cursosDaCategoria.set(t.curso.id, {
        id: t.curso.id,
        nome: t.curso.nome,
        cargaHoraria: t.curso.cargaHoraria,
      });
    }
    // Curso concluído entra mesmo se hoje não estiver mais ofertado: emblema
    // conquistado não some do perfil.
    for (const cert of primeiraConclusaoPorCurso.values()) {
      if (!cursosDaCategoria.has(cert.cursoId)) {
        cursosDaCategoria.set(cert.cursoId, {
          id: cert.cursoId,
          nome: cert.cursoNome,
          cargaHoraria: cert.cargaHoraria,
        });
      }
    }

    emblemas = [...cursosDaCategoria.values()]
      .map((c) => {
        const conquista = primeiraConclusaoPorCurso.get(c.id);
        return {
          cursoId: c.id,
          cursoNome: c.nome,
          cargaHoraria: c.cargaHoraria,
          conquistado: Boolean(conquista),
          dataConquista: conquista?.dataConclusao ?? null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.conquistado) - Number(a.conquistado) ||
          a.cursoNome.localeCompare(b.cursoNome),
      );
  }

  // ── Rankings: só entre a mesma profissão, geral e dentro da unidade ──
  let rankingCategoria: RankingResumo | null = null;
  let rankingUnidade: (RankingResumo & { unidadeNome: string }) | null = null;

  if (user.profissao) {
    const participantes = await db.query.users.findMany({
      where: and(
        eq(users.profissao, user.profissao),
        eq(users.ativo, true),
      ),
      columns: { id: true, nome: true },
    });

    const conclusoes = await conclusoesPorUsuario(participantes.map((p) => p.id));
    rankingCategoria = montarRanking(participantes, conclusoes, userId);

    const vinculoAtivo = user.vinculos[0];
    if (vinculoAtivo) {
      const colegasDeUnidade = await db.query.vinculos.findMany({
        where: and(
          eq(vinculos.unidadeId, vinculoAtivo.unidadeId),
          eq(vinculos.status, "ATIVO"),
        ),
        columns: { userId: true },
      });
      const idsDaUnidade = new Set(colegasDeUnidade.map((v) => v.userId));
      const participantesUnidade = participantes.filter((p) =>
        idsDaUnidade.has(p.id),
      );
      rankingUnidade = {
        ...montarRanking(participantesUnidade, conclusoes, userId),
        unidadeNome: vinculoAtivo.unidade.nome,
      };
    }
  }

  const pontosMeus = [...primeiraConclusaoPorCurso.values()].reduce(
    (soma, cert) => soma + pontosDoCurso(cert.cargaHoraria),
    0,
  );
  const horasConcluidas = conclusoesMinhas.reduce(
    (soma, e) => soma + (e.turma.curso.cargaHoraria ?? 0),
    0,
  );

  return {
    resumo: {
      pontos: pontosMeus,
      cursosConcluidos: primeiraConclusaoPorCurso.size,
      horasConcluidas,
      emblemasConquistados: emblemas.filter((e) => e.conquistado).length,
      emblemasTotal: emblemas.length,
    },
    certificados,
    emblemas,
    rankingCategoria,
    rankingUnidade,
  };
}
