import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { municipios, unidades } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { unidadeSchema } from "@/lib/schemas";
import { logAudit } from "@/server/services/audit.service";
import { getRequestIp } from "@/server/lib/rate-limit";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const allUnidades = await db.query.unidades.findMany({
      with: { municipio: true },
      orderBy: [desc(unidades.createdAt)],
    });

    return apiSuccess(allUnidades);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "unidade:create")) {
      return apiError(new ForbiddenError());
    }

    const parsed = unidadeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const municipio = await db.query.municipios.findFirst({
      where: eq(municipios.id, parsed.data.municipioId),
    });
    if (!municipio) return apiError(new NotFoundError("Município"));

    const [criada] = await db
      .insert(unidades)
      .values({
        nome: parsed.data.nome.trim(),
        tipo: parsed.data.tipo,
        municipioId: parsed.data.municipioId,
        endereco: parsed.data.endereco?.trim() || null,
      })
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "unidade.criada",
      entityType: "unidade",
      entityId: criada.id,
      newValue: {
        nome: criada.nome,
        tipo: criada.tipo,
        municipioId: criada.municipioId,
      },
      ipAddress: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess({ ...criada, municipio }, 201);
  } catch (error) {
    return apiError(error);
  }
}
