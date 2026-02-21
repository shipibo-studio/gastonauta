# AGENTS.md

## Lineamientos de diseño para vistas y componentes

- **Efecto glass (glassmorphism):** Usa fondos con transparencia (`bg-white/10`, `bg-stone-900/40`, `backdrop-blur-xl`), bordes sutiles y sombras suaves para paneles y formularios.
- **Estilo moderno-neon:** Incorpora acentos y brillos en colores neón (por ejemplo, cyan, verde, rosa) en botones, títulos o detalles, usando sombras y efectos de glow (`shadow-cyan-400/60`, `drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]`).
- **Tipografía:**
  - Títulos: `font-serif` (Instrument Serif)
  - Textos y formularios: `font-sans` (Source Sans 3, fallback a system fonts)
- **Color scheme:**
  - Base en tonos `stone` de Tailwind para fondos, bordes y textos principales.
  - Acentos neón solo para resaltar acciones o elementos clave.

- **Accesibilidad y UX:**
  - Mantén buen contraste entre texto y fondo.
  - Usa `focus:ring` y `focus:border` en inputs y botones.
  - Todos los links y botones deben mostrar `cursor-pointer` al hacer hover para indicar interactividad.
  - Todos los botones deben tener `cursor: pointer;` al `:hover`.
  - **Confirmación de acciones destructivas:** Siempre que se realice una acción de eliminación (delete), debe usarse el componente `ConfirmModal` para confirmar la acción. Nunca usar `window.confirm()` o `confirm()` nativo del navegador.

> Aplica estos lineamientos en todas las vistas y componentes para mantener coherencia visual y experiencia moderna.

## Migraciones de Base de Datos (Supabase)

- Todas las migraciones SQL deben ubicarse en `supabase/migrations/`.
- El formato de nombres debe ser secuencial: `001_nombre_descriptivo.sql`, `002_otro_nombre.sql`, etc.
- Ejecuta las migraciones en orden numérico desde el SQL Editor de Supabase o via CLI.
- Cada migración debe ser idempotente (usar `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.).

## Edge Functions (Supabase)

- Las Edge Functions se crean en `supabase/functions/nombre-funcion/index.ts`.
- Usar Deno como runtime (no Node.js).
- Importar Supabase desde `https://esm.sh/@supabase/supabase-js@2`.
- Las funciones deben incluir headers CORS: `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, etc.
- Usar variables de entorno de Supabase: `Deno.env.get('SUPABASE_URL')` y `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.
- Para autenticación simple, usar Bearer token en el header `Authorization`.
- Desplegar con: `supabase functions deploy nombre-funcion`.
- Invocar con: `https://<project>.supabase.co/functions/v1/nombre-funcion`.
- Obtener desde archivo .env supabase `<project>` ID.
