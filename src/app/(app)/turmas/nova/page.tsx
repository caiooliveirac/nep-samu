import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { cursos } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NovaTurmaForm } from "./nova-turma-form";

export default async function NovaTurmaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const allCursos = await db.query.cursos.findMany({
    where: eq(cursos.ativo, true),
    columns: { id: true, nome: true, publicoAlvoProfissoes: true },
    orderBy: (c, { asc }) => [asc(c.nome)],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Nova Turma</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Crie uma nova oferta/edição de um curso
        </p>
      </div>
      <NovaTurmaForm cursos={allCursos} />
    </div>
  );
}
