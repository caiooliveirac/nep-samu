import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { users, vinculos } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPerfilGamificacao } from "@/server/services/gamificacao.service";
import { PerfilClient } from "./perfil-client";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { passwordHash: false },
    with: {
      vinculos: {
        where: eq(vinculos.status, "ATIVO"),
        orderBy: [desc(vinculos.updatedAt)],
        with: { unidade: { with: { municipio: true } } },
      },
    },
  });
  if (!user) redirect("/login");

  const gamificacao = await getPerfilGamificacao(user.id);

  return (
    <PerfilClient
      usuario={{
        nome: user.nome,
        email: user.email,
        role: user.role,
        profissao: user.profissao,
        unidades: user.vinculos.map((v) => ({
          nome: v.unidade.nome,
          municipio: v.unidade.municipio?.nome ?? null,
        })),
      }}
      gamificacao={gamificacao}
    />
  );
}
