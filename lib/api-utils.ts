import { NextResponse } from "next/server";

/**
 * Log the real error server-side and return a safe generic message to the client.
 * Prevents leaking Prisma internals, stack traces, or DB details.
 */
export function errorResponse(error: unknown, context?: string, status = 500): NextResponse {
  console.error(`[API${context ? ` ${context}` : ""}]`, error);
  return NextResponse.json(
    { error: "Une erreur interne est survenue. Veuillez réessayer." },
    { status }
  );
}
