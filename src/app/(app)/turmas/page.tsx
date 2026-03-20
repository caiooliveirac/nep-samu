import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { turmas } from "@/server/db/schema";
import { desc } from "drizzle-orm";
import { TurmasClient } from "./turmas-client";

export default async function TurmasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allTurmas = await db.query.turmas.findMany({
    with: { curso: true },
    orderBy: [desc(turmas.dataInicio)],
  });

  return (
    <TurmasClient turmas={allTurmas} role={session.user.role} />
  );
}
