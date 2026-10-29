// OpenNext Cloudflare — config mínima para el preview.
// Sin caché incremental (R2) en esta fase: el preview no necesita ISR
// persistente y así evitamos un binding extra. Se añadirá en fases
// posteriores solo si alguna ruta lo requiere.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
