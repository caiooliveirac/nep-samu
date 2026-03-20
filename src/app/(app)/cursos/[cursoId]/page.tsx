import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { cursos, turmas, users } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Clock, Users, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TurmaStatusBadge } from "@/components/shared/status-badge";
import { isValidUUID } from "@/lib/schemas";

export default async function CursoDetailPage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { cursoId } = await params;
  if (!isValidUUID(cursoId)) notFound();

  const curso = await db.query.cursos.findFirst({
    where: and(eq(cursos.id, cursoId), eq(cursos.ativo, true)),
    with: { categoria: true },
  });

  if (!curso) notFound();

  const allTurmasCurso = await db.query.turmas.findMany({
    where: and(
      eq(turmas.cursoId, cursoId),
      ne(turmas.status, "CANCELADA"),
      ...(session.user.role !== "ORGANIZADOR" ? [ne(turmas.status, "RASCUNHO")] : []),
    ),
    orderBy: (t, { desc }) => [desc(t.dataInicio)],
  });

  // Profissionais só veem turmas para as quais são elegíveis
  let turmasRelacionadas = allTurmasCurso;
  if (session.user.role === "PROFISSIONAL") {
    const profissao =
      session.user.profissao ??
      (await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { profissao: true } }))?.profissao;
    if (profissao) {
      turmasRelacionadas = allTurmasCurso.filter((t) => {
        const profs = t.profissoesElegiveis as string[] | null;
        return Array.isArray(profs) && profs.includes(profissao);
      });
    }
  }

  const formatCargaHoraria = (min: number | null) => {
    if (!min) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/cursos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{curso.nome}</h1>
            {curso.categoria && (
              <span className="mt-1 inline-block rounded bg-[var(--bg-surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                {curso.categoria.nome}
              </span>
            )}
          </div>
          {session.user.role === "ORGANIZADOR" && (
            <Link href={`/cursos/${cursoId}/editar`}>
              <Button variant="outline" size="sm">
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border-l-4 border-l-[var(--samu-blue)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            Carga Horária
          </div>
          <p className="mt-1 text-lg font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            {formatCargaHoraria(curso.cargaHoraria)}
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-l-[var(--samu-orange)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Users className="h-3.5 w-3.5" />
            Público-alvo
          </div>
          <p className="mt-1 text-sm font-medium">
            {curso.publicoAlvoDescritivo || "Não definido"}
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-l-[var(--status-info)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Layers className="h-3.5 w-3.5" />
            Turmas
          </div>
          <p className="mt-1 text-lg font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            {turmasRelacionadas.length}
          </p>
        </div>
      </div>

      {/* Descrição */}
      {curso.descricao && (
        <div className="rounded-lg bg-[var(--bg-secondary)] p-5">
          <h2 className="mb-2 font-display text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Descrição
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {curso.descricao}
          </p>
        </div>
      )}

      {/* Turmas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Turmas deste curso</h2>
          {session.user.role === "ORGANIZADOR" && (
            <Link href={`/turmas/nova?cursoId=${cursoId}`}>
              <Button size="sm">Nova Turma</Button>
            </Link>
          )}
        </div>

        {turmasRelacionadas.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Nenhuma turma cadastrada para este curso
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                  <th className="px-5 py-3 font-medium">Título</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Vagas</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {turmasRelacionadas.map((turma) => (
                  <tr
                    key={turma.id}
                    className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                  >
                    <td className="px-5 py-3 font-medium">{turma.titulo}</td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">
                      {new Date(turma.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td
                      className="px-5 py-3 text-[var(--text-secondary)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {turma.vagasTotais}
                    </td>
                    <td className="px-5 py-3">
                      <TurmaStatusBadge status={turma.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/turmas/${turma.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
