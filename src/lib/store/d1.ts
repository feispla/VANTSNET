// Almacén de identidad sobre D1 (SQL directo + zod) — FASE F del plan
// VANTS PREVIEW. El ORM 8 RC y el contrato PG (TimestamptzString) no son
// compatibles con D1, así que esta preview usa SQL parametrizado con
// validación de salida. Prisma queda INTACTO para la ruta pg.
//
// Regla de oro del perfil: el displayName del proveedor SOLO es valor
// inicial en la creación — NUNCA sobrescribe el nombre personalizado.

import { z } from 'zod';
import { envCf } from '../cf-env';
import type { Identidad, Usuario, UsuarioConIdentidades } from './types';

export type { Identidad, Usuario, UsuarioConIdentidades } from './types';

// D1Database mínima (sin @cloudflare/workers-types)
export interface AlmacenD1 {
  prepare(sql: string): {
    bind(...vals: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

/** Resuelve el binding DB de la D1 de preview (null fuera del worker). */
export async function d1Preview(): Promise<AlmacenD1 | null> {
  const env = await envCf();
  return (env?.DB as AlmacenD1 | undefined) ?? null;
}

// ---------- validación de salida (zod) ----------

const esquemaUsuario = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const esquemaIdentidad = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  provider: z.enum(['discord', 'faceit', 'riot', 'steam']),
  provider_id: z.string().min(1),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  raw_json: z.string().nullable().optional(),
  last_sync_at: z.string().nullable().optional(),
  created_at: z.string().min(1),
});

function filaAUsuario(f: z.infer<typeof esquemaUsuario>): Usuario {
  return { id: f.id, displayName: f.display_name, createdAt: f.created_at, updatedAt: f.updated_at };
}

function filaAIdentidad(f: z.infer<typeof esquemaIdentidad>): Identidad {
  return {
    id: f.id,
    userId: f.user_id,
    provider: f.provider,
    providerId: f.provider_id,
    displayName: f.display_name ?? null,
    avatarUrl: f.avatar_url ?? null,
    rawJson: f.raw_json ?? null,
    lastSyncAt: f.last_sync_at ?? null,
    createdAt: f.created_at,
  };
}

// ---------- ids (cuid2-like sin dependencia: crypto aleatorio) ----------

function nuevoId(): string {
  const alfabeto = '0123456789abcdefghijklmnopqrstuvwxyz';
  let s = 'c';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += alfabeto[b % alfabeto.length];
  return s;
}

// ---------- operaciones ----------

export async function obtenerUsuario(db: AlmacenD1, id: string): Promise<Usuario | null> {
  const fila = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();
  const u = esquemaUsuario.safeParse(fila);
  return u.success ? filaAUsuario(u.data) : null;
}

export async function obtenerUsuarioConIdentidades(
  db: AlmacenD1,
  id: string
): Promise<UsuarioConIdentidades | null> {
  const usuario = await obtenerUsuario(db, id);
  if (!usuario) return null;
  const r = await db
    .prepare('SELECT * FROM provider_identities WHERE user_id = ? ORDER BY created_at')
    .bind(id)
    .all();
  const identidades = (r.results ?? [])
    .map((f) => esquemaIdentidad.safeParse(f))
    .filter((x) => x.success)
    .map((x) => x.data as z.infer<typeof esquemaIdentidad>)
    .map(filaAIdentidad);
  return {
    ...usuario,
    identidades: identidades.map((i) => ({
      provider: i.provider,
      providerId: i.providerId,
      displayName: i.displayName,
      avatarUrl: i.avatarUrl,
    })),
  };
}

/** Vincula (idempotente) una identidad externa. Si existe, actualiza los
 *  datos DEL PROVEEDOR; si no, crea usuario nuevo con displayName inicial. */
export async function vincularIdentidad(
  db: AlmacenD1,
  entrada: {
    provider: Identidad['provider'];
    providerId: string;
    displayName: string;
    avatarUrl?: string | null;
    rawJson?: string | null;
  }
): Promise<{ usuario: Usuario; identidad: Identidad; creada: boolean }> {
  const ahora = new Date().toISOString();
  const existente = await db
    .prepare('SELECT * FROM provider_identities WHERE provider = ? AND provider_id = ?')
    .bind(entrada.provider, entrada.providerId)
    .first();

  if (existente) {
    const id = esquemaIdentidad.parse(existente);
    await db
      .prepare(
        'UPDATE provider_identities SET display_name = ?, avatar_url = ?, raw_json = ?, last_sync_at = ? WHERE id = ?'
      )
      .bind(
        entrada.displayName,
        entrada.avatarUrl ?? null,
        entrada.rawJson ?? null,
        ahora,
        id.id
      )
      .run();
    const usuario = await obtenerUsuario(db, id.user_id);
    if (!usuario) throw new Error('store-d1: usuario huérfano ' + id.user_id);
    return { usuario, identidad: filaAIdentidad({ ...id, last_sync_at: ahora }), creada: false };
  }

  const userId = nuevoId();
  await db
    .prepare('INSERT INTO users (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(userId, entrada.displayName, ahora, ahora)
    .run();
  const identidadId = nuevoId();
  await db
    .prepare(
      `INSERT INTO provider_identities
       (id, user_id, provider, provider_id, display_name, avatar_url, raw_json, last_sync_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      identidadId,
      userId,
      entrada.provider,
      entrada.providerId,
      entrada.displayName,
      entrada.avatarUrl ?? null,
      entrada.rawJson ?? null,
      ahora,
      ahora
    )
    .run();
  const usuario = await obtenerUsuario(db, userId);
  if (!usuario) throw new Error('store-d1: fallo al leer usuario recién creado');
  return {
    usuario,
    identidad: filaAIdentidad(
      esquemaIdentidad.parse({
        id: identidadId,
        user_id: userId,
        provider: entrada.provider,
        provider_id: entrada.providerId,
        display_name: entrada.displayName,
        avatar_url: entrada.avatarUrl ?? null,
        raw_json: entrada.rawJson ?? null,
        last_sync_at: ahora,
        created_at: ahora,
      })
    ),
    creada: true,
  };
}

/** Actualiza el nombre personalizado del usuario (con sesión). */
export async function actualizarDisplayName(
  db: AlmacenD1,
  userId: string,
  displayName: string
): Promise<Usuario | null> {
  const ahora = new Date().toISOString();
  await db
    .prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?')
    .bind(displayName, ahora, userId)
    .run();
  return obtenerUsuario(db, userId);
}

/** Identidades del usuario (para verificar que FACEIT sobrevive al logout). */
export async function identidadesDe(
  db: AlmacenD1,
  userId: string
): Promise<Identidad[]> {
  const r = await db
    .prepare('SELECT * FROM provider_identities WHERE user_id = ? ORDER BY created_at')
    .bind(userId)
    .all();
  return (r.results ?? [])
    .map((f) => esquemaIdentidad.safeParse(f))
    .filter((x) => x.success)
    .map((x) => filaAIdentidad(x.data as z.infer<typeof esquemaIdentidad>));
}
