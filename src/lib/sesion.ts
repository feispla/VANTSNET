// Sesión de la preview VANTSNET: cookie HttpOnly firmada con HMAC-SHA256.
// El secret SOLO vive del lado del servidor (SESION_SECRET en el worker).
// Sin sesiones en DB: la cookie lleva {uid, iat, exp} firmados; el UID se
// resuelve contra users/provider_identities en la D1 de preview. Logout =
// invalidar la cookie (cero borrados en DB — el perfil sobrevive).

import { z } from 'zod';

export const NOMBRE_COOKIE = 'vants_sesion';
/** 30 días, igual que el ciclo típico de re-login de Discord. */
export const TTL_SEGUNDOS = 60 * 60 * 24 * 30;

const esquemaCarga = z.object({
  uid: z.string().min(1),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export type CargaSesion = z.infer<typeof esquemaCarga>;

function secretBytes(): Uint8Array {
  const secret = process.env.SESION_SECRET?.trim();
  if (!secret) throw new Error('sesion: falta SESION_SECRET');
  return new TextEncoder().encode(secret);
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const raw = atob(pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmacHex(mensaje: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes() as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(mensaje));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Crea el valor de cookie `carga.firma` para la sesión de uid. */
export async function crearValorCookie(uid: string, ahoraMs = Date.now()): Promise<string> {
  const carga: CargaSesion = {
    uid,
    iat: Math.floor(ahoraMs / 1000),
    exp: Math.floor(ahoraMs / 1000) + TTL_SEGUNDOS,
  };
  const cuerpo = b64urlEncode(new TextEncoder().encode(JSON.stringify(carga)));
  const firma = await hmacHex(cuerpo);
  return `${cuerpo}.${firma}`;
}

/** Verifica firma + expiración. Devuelve la carga o null (honesto). */
export async function verificarValorCookie(
  valor: string | undefined | null,
  ahoraMs = Date.now()
): Promise<CargaSesion | null> {
  if (!valor) return null;
  const punto = valor.lastIndexOf('.');
  if (punto <= 0) return null;
  const cuerpo = valor.slice(0, punto);
  const firma = valor.slice(punto + 1);
  try {
    const esperada = await hmacHex(cuerpo);
    if (firma.length !== esperada.length) return null;
    // comparación en tiempo constante
    let diff = 0;
    for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
    if (diff !== 0) return null;
    const carga = esquemaCarga.safeParse(JSON.parse(new TextDecoder().decode(b64urlDecode(cuerpo))));
    if (!carga.success) return null;
    if (carga.data.exp * 1000 <= ahoraMs) return null;
    return carga.data;
  } catch {
    return null;
  }
}

/** Lee la carga de sesión desde un objeto tipo Request (headers cookie). */
export async function sesionDeCookies(
  cabeceraCookie: string | null | undefined
): Promise<CargaSesion | null> {
  if (!cabeceraCookie) return null;
  const par = cabeceraCookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${NOMBRE_COOKIE}=`));
  if (!par) return null;
  return verificarValorCookie(decodeURIComponent(par.slice(NOMBRE_COOKIE.length + 1)));
}

/** Atributos de Set-Cookie (Secure solo si https). */
export function atributosCookie(https = true): string {
  const partes = [
    `${NOMBRE_COOKIE}=${''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=0`,
  ];
  if (https) partes.splice(1, 0, 'Secure');
  return partes.join('; ');
}

/** Set-Cookie para CREAR sesión. */
export async function cookieDeSesion(
  uid: string,
  https = true
): Promise<{ name: string; value: string; attributes: string }> {
  const valor = await crearValorCookie(uid);
  const partes = [
    `${NOMBRE_COOKIE}=${encodeURIComponent(valor)}`,
    ...(https ? ['Secure'] : []),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${TTL_SEGUNDOS}`,
  ];
  return { name: NOMBRE_COOKIE, value: valor, attributes: partes.join('; ') };
}

/** Set-Cookie para CERRAR sesión (Max-Age=0; no borra nada en DB). */
export function cookieDeCierre(https = true): string {
  return atributosCookie(https);
}
