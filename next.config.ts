import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Los errores de TypeScript NO se ignoran: el build debe fallar si el
  // código no tipa (quality gate). El chequeo se ejecuta también en CI.
  // OpenNext (Cloudflare) empaqueta el server con la condición `workerd` de
  // esbuild: pg-cloudflare resuelve `exports['.'].workerd -> ./esm/index.mjs`,
  // pero el trazado por defecto de Next solo incluye la rama `default`
  // (dist/empty.js) y el bundling falla con "Could not resolve pg-cloudflare".
  // Con esto forzamos el módulo completo en el trazado (el punto '/api/health'
  // basta: OpenNext genera una única función default con todo el server).
  outputFileTracingIncludes: {
    "/api/health": ["./node_modules/pg-cloudflare/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
