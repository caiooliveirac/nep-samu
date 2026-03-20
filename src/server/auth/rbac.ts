import type { Role } from "@/lib/enums";

export type Permission =
  | "curso:create"
  | "curso:edit"
  | "curso:delete"
  | "turma:create"
  | "turma:edit"
  | "turma:delete"
  | "turma:publish"
  | "turma:cancel"
  | "turma:manage_enrollments"
  | "turma:manage_attendance"
  | "unidade:create"
  | "unidade:edit"
  | "profissional:create"
  | "profissional:validate"
  | "profissional:invite"
  | "enrollment:create"
  | "enrollment:cancel_own"
  | "enrollment:confirm_own"
  | "relatorio:view"
  | "relatorio:export"
  | "notificacao:send"
  | "audit:view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ORGANIZADOR: [
    "curso:create",
    "curso:edit",
    "curso:delete",
    "turma:create",
    "turma:edit",
    "turma:delete",
    "turma:publish",
    "turma:cancel",
    "turma:manage_enrollments",
    "turma:manage_attendance",
    "unidade:create",
    "unidade:edit",
    "profissional:create",
    "profissional:validate",
    "relatorio:view",
    "relatorio:export",
    "notificacao:send",
    "audit:view",
  ],
  COORDENADOR: [
    "profissional:create",
    "profissional:validate",
    "profissional:invite",
    "enrollment:create",
    "relatorio:view",
  ],
  PROFISSIONAL: [
    "enrollment:create",
    "enrollment:cancel_own",
    "enrollment:confirm_own",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getUserPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
