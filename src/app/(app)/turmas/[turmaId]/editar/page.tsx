import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { turmas, cursos } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { EditarTurmaForm } from "./editar-turma-form";
import { isValidUUID } from "@/lib/schemas";

export default async function EditarTurmaPage({
  params,
}: {
  params: Promise<{ turmaId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const { turmaId } = await params;
  if (!isValidUUID(turmaId)) notFound();

  const turma = await db.query.turmas.findFirst({
    where: eq(turmas.id, turmaId),
    with: { curso: true },
  });

  if (!turma) notFound();

  const allCursos = await db.query.cursos.findMany({
    where: eq(cursos.ativo, true),
    orderBy: (c, { asc }) => [asc(c.nome)],
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Editar Turma</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {turma.titulo}
        </p>
      </div>
      <EditarTurmaForm turma={turma} cursos={allCursos} />
    </div>
  );
}
