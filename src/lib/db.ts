// Punto único de acceso a la base de datos (Prisma ORM 8).
// El cliente real vive en src/prisma/db.ts; este módulo mantiene la import
// `@/lib/db` que usa toda la aplicación y añade utilidades de migración.
import { db } from "@/prisma/db";

export { db, contract } from "@/prisma/db";

/**
 * Normaliza un valor temporal del contrato (TimestamptzString) a ISO-8601 UTC.
 * PostgreSQL devuelve el texto tal como lo imprime, p. ej.
 * "2026-10-25 19:30:48.308999+00": separador con espacio, microsegundos y
 * offset sin minutos — `new Date()` no lo parsea de forma fiable, así que se
 * normaliza (T separator, 3 dígitos de ms, offset +HH:MM) antes de convertir.
 * Las respuestas JSON de VANTSNET entregan ISO con Z, igual que con Prisma 6.
 */
export function toIsoTimestamp(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const normalized = value
    .trim()
    .replace(" ", "T") // "2026-10-25 19:30:48" -> "2026-10-25T19:30:48"
    .replace(/\.(\d{3})\d+/, ".$1") // microsegundos .308999 -> .308
    .replace(/([+-]\d{2})$/, "$1:00"); // offset +00 -> +00:00
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    console.error("toIsoTimestamp: valor temporal no parseable:", value);
    return null;
  }
  return date.toISOString();
}

/**
 * True si el error es una violación de restricción única (equivale al
 * antiguo P2002 de Prisma 6). Estado SQL estándar 23505 en cualquier BD.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    "sqlState" in err &&
    (err as { sqlState?: string }).sqlState === "23505"
  );
}
