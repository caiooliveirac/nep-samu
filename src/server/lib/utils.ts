import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function apiError(error: unknown): NextResponse {
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
