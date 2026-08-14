import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { db } from "@/server/db";
import {
  listarUsuariosParaTela,
  listarUsuariosRemovidos,
} from "@/server/services/usuario-admin.service";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role as Role, "usuario:manage")) {
    redirect("/painel");
  }

  const [usuarios, removidos, unidades] = await Promise.all([
    listarUsuariosParaTela(),
    listarUsuariosRemovidos(),
    db.query.unidades.findMany({
      with: { municipio: true },
      orderBy: (u, { asc }) => [asc(u.nome)],
    }),
  ]);

  return (
    <UsuariosClient
      usuarios={usuarios}
      removidos={removidos}
      unidades={unidades
        .filter((u) => u.ativo)
        .map((u) => ({
          id: u.id,
          nome: u.nome,
          municipio: u.municipio?.nome ?? null,
        }))}
      meuId={session.user.id}
    />
  );
}
