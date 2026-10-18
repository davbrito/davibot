# ADR 0001 — Deno como runtime canónico y Cloudflare en pausa

- **Estado:** aceptada
- **Fecha:** 2026-10-18
- **Contexto:** `main` (Deno) y la rama `cloudflare-worker`

## Contexto

`main` corre en Deno: Deno Deploy, Deno KV y `Deno.cron`. La rama `cloudflare-worker` explora un
entrypoint para Cloudflare Workers con su propio tooling (pnpm, Wrangler, unstorage y cheerio). Una
iteración anterior también apuntaba a Vercel; ese soporte se descartó después.

La adopción de Cloudflare en `main` **no se completó**: el scraping de `dle.rae.es` falla porque la
web de la RAE bloquea las peticiones. El sitio está detrás de un Cloudflare Managed Challenge y
responde `403` con `cf-mitigated: challenge` a peticiones que no parecen de un navegador. La rama
añade headers de navegador para intentar evitarlo, pero el bloqueo no se pudo sortear de forma
fiable desde Workers. Sin acceso al diccionario, el bot no puede operar.

## Decisión

- `main` (Deno) es la rama canónica y el entorno de producción.
- No se mergea el runtime de Workers ni su tooling de build en `main`. Las librerías
  platform-neutral (por ejemplo, unstorage) sí se pueden adoptar en Deno.
- Las mejoras de comportamiento del branch se portan manualmente a Deno.
- La estrategia de paridad a largo plazo (rebase o `PARITY.md`) queda pospuesta por ahora.

## Consecuencias

- Los cambios del branch Cloudflare se portan a mano.
- Se reevaluará la migración si RAE deja de bloquear las peticiones o si se añade un proxy/caché
  alternativo para el diccionario.
- Deno Deploy sigue siendo el entorno de despliegue.
