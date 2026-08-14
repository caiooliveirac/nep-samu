import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { cursos } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { CursosClient } from "./cursos-client";

export default async function CursosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ORGANIZADOR") {
    redirect("/painel");
  }

  const allCursos = await db.query.cursos.findMany({
    where: eq(cursos.ativo, true),
    orderBy: (cursos, { asc }) => [asc(cursos.nome)],
  });

  return <CursosClient cursos={allCursos} />;
}
