import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { ZodError } from "zod/v4";

export function apiError(error: unknown): NextResponse {
  // Sem isto, qualquer campo inválido virava 500 "Erro interno do servidor" e a
  // mensagem de validação — que diz exatamente o que corrigir — morria no log.
  if (error instanceof ZodError) {
    const problemas = error.issues.map((i) => ({
      campo: i.path.join("."),
      mensagem: i.message,
    }));
    return NextResponse.json(
      {
        error: problemas[0]?.mensagem ?? "Dados inválidos",
        code: "VALIDATION_ERROR",
        problemas,
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 },
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
