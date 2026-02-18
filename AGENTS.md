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

> Aplica estos lineamientos en todas las vistas y componentes para mantener coherencia visual y experiencia moderna.
