// Acceso al entorno de Cloudflare Workers (bindings y secrets del worker).
// Devuelve null fuera del runtime CF (next dev local): el llamador decide
// el fallback. Memoizado por isolado: getCloudflareContext es barato, pero
// evitamos repetir el import dinámico en cada request.

export interface EnlaceServicio {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

type EnvCf = Record<string, unknown>;

let envMemo: EnvCf | null | undefined;

export async function envCf(): Promise<EnvCf | null> {
  if (envMemo !== undefined) return envMemo;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    envMemo = env as unknown as EnvCf;
  } catch {
    // Fuera del runtime de Cloudflare (next dev sin platformProxy)
    envMemo = null;
  }
  return envMemo;
}
