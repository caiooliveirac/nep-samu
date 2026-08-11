import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { db } from "@/server/db";
import { listarUsuarios } from "@/server/services/usuario-admin.service";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role as Role, "usuario:manage")) {
    redirect("/painel");
  }

  const [usuarios, unidades] = await Promise.all([
    listarUsuarios(),
    db.query.unidades.findMany({
      with: { municipio: true },
      orderBy: (u, { asc }) => [asc(u.nome)],
    }),
  ]);

  return (
    <UsuariosClient
      usuarios={usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        profissao: u.profissao,
        ativo: u.ativo,
        mustChangePassword: u.mustChangePassword,
        emailRecebe: u.emailRecebe,
        unidadeId: u.vinculos?.find((v) => v.isCoordenador)?.unidadeId
          ?? u.vinculos?.[0]?.unidadeId
          ?? null,
        unidadeNome: u.vinculos?.find((v) => v.isCoordenador)?.unidade?.nome
          ?? u.vinculos?.[0]?.unidade?.nome
          ?? null,
      }))}
      unidades={unidades.map((u) => ({
        id: u.id,
        nome: u.nome,
        municipio: u.municipio?.nome ?? null,
      }))}
      meuId={session.user.id}
    />
  );
}
