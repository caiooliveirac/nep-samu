import { db } from "@/server/db";
import { turmas, enrollments, cursos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import type { Role } from "@/lib/enums";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "relatorio:view")) {
      return apiError(new ForbiddenError());
    }

    // Métricas
    const [cursosAtivos] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cursos)
      .where(eq(cursos.ativo, true));

    const [turmasAbertas] = await db
      .select({ count: sql<number>`count(*)` })
      .from(turmas)
      .where(
        inArray(turmas.status, ["INSCRICOES_ABERTAS", "LOTADA"]),
      );

    const [totalInscritos] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        inArray(enrollments.status, [
          "INSCRITO",
          "PROMOVIDO",
          "CONFIRMADO",
          "PRESENTE",
        ]),
      );

    const [confirmados] = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        inArray(enrollments.status, ["CONFIRMADO", "PRESENTE"]),
      );

    const totalInsc = Number(totalInscritos.count);
    const totalConf = Number(confirmados.count);
    const taxaConfirmacao =
      totalInsc > 0 ? Math.round((totalConf / totalInsc) * 100) : 0;

    // Turmas recentes com contagens
    const turmasRecentes = await db.query.turmas.findMany({
      with: { curso: true },
      orderBy: [desc(turmas.dataInicio)],
      limit: 10,
    });

    const turmasComContagem = await Promise.all(
      turmasRecentes
        .filter((t) => t.status !== "RASCUNHO" && t.status !== "CANCELADA")
        .map(async (t) => {
          const [inscritos] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.turmaId, t.id),
                inArray(enrollments.status, [
                  "INSCRITO",
                  "PROMOVIDO",
                  "CONFIRMADO",
                  "PRESENTE",
                ]),
              ),
            );

          const [conf] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.turmaId, t.id),
                inArray(enrollments.status, ["CONFIRMADO", "PRESENTE"]),
              ),
            );

          const [fila] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.turmaId, t.id),
                eq(enrollments.status, "FILA_ESPERA"),
              ),
            );

          return {
            id: t.id,
            titulo: t.titulo,
            dataInicio: t.dataInicio,
            status: t.status,
            vagasTotais: t.vagasTotais,
            inscritos: Number(inscritos.count),
            confirmados: Number(conf.count),
            filaEspera: Number(fila.count),
          };
        }),
    );

    return apiSuccess({
      metrics: {
        cursosAtivos: Number(cursosAtivos.count),
        turmasAbertas: Number(turmasAbertas.count),
        totalInscritos: totalInsc,
        taxaConfirmacao,
      },
      turmasRecentes: turmasComContagem,
    });
  } catch (error) {
    return apiError(error);
  }
}
