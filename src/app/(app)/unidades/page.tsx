import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { UnidadesClient } from "./unidades-client";

export default async function UnidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const allUnidades = await db.query.unidades.findMany({
    with: { municipio: true },
  });

  return <UnidadesClient unidades={allUnidades} />;
}
