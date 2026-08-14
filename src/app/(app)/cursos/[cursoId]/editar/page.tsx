import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { cursos } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { EditarCursoForm } from "./editar-curso-form";
import { isValidUUID } from "@/lib/schemas";

export default async function EditarCursoPage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const { cursoId } = await params;
  if (!isValidUUID(cursoId)) notFound();

  const curso = await db.query.cursos.findFirst({
    where: and(eq(cursos.id, cursoId), eq(cursos.ativo, true)),
  });

  if (!curso) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Editar Curso</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {curso.nome}
        </p>
      </div>
      <EditarCursoForm curso={curso} />
    </div>
  );
}
