
# Gastonauta

Proyecto de gestión de gastos personales 💸

## Stack actual

- Next.js 16 (App Router)
- React 18
- TypeScript
- Tailwind CSS (color scheme stone, glassmorphism, neon accents)
- shadcn/ui (componentes UI)
- lucide-react (iconos)
- Google Fonts: Instrument Serif (títulos), Source Sans 3 (texto)
- **Supabase** (Base de datos PostgreSQL, Auth, Storage, Edge Functions)

## Despliegue

Este proyecto está configurado para desplegarse en **Vercel** u **Netlify** (Next.js 16 App Router).

### Vercel (recomendado para Next.js)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shipibo-studio/gastonauta)

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/shipibo-studio/gastonauta)

### Variables de entorno necesarias

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Supabase

El proyecto utiliza **Supabase** como backend:
- **Base de datos**: PostgreSQL
- **Autenticación**: Email/password auth
- **Storage**: Para archivos adjuntos
- **Edge Functions**: Para procesamiento serverless (categorización con IA)

### Configuración de Supabase

1. Crear proyecto en [Supabase](https://supabase.com/)
2. Obtener `URL` y `anon key` del dashboard
3. Configurar las variables de entorno
4. Ejecutar migraciones SQL desde `supabase/migrations/`

## Estructura de rutas

- `/` — Login (email/password, validación, diseño glass/neon)
- `/dashboard` — Dashboard principal (sidebar colapsable, charts placeholder)
- `/dashboard/gastos` — Mis gastos (selección múltiple, cálculos, paginación, ver-todo)
- `/dashboard/log` — Log (pendiente de contenido)
- `/dashboard/settings` — Configuración (pendiente de contenido)
- `/logout` — Cerrar sesión

## Desarrollo

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
