import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { listarUsuarios } from "@/server/services/usuario-admin.service";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role as Role, "usuario:manage")) {
    redirect("/painel");
  }

  const usuarios = await listarUsuarios();

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
      }))}
      meuId={session.user.id}
    />
  );
}
