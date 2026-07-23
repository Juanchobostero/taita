# Taita Soluciones

Plataforma web para conectar personas con técnicos locales verificados. Desarrollada por [JOTADEV](https://www.jotadev.com.ar).

## Stack

- **Astro** — framework principal con SSR (Node adapter)
- **React** — componentes interactivos (`client:load`)
- **Tailwind CSS v4** — estilos, design system propio
- **Supabase** — base de datos, autenticación y RLS
- **shadcn/ui** — componentes de formulario base
- **TypeScript**

## Funcionalidades

- Landing pública con categorías de servicios
- Listado y búsqueda de técnicos verificados
- Registro y login (cliente / técnico / admin)
- Panel de cliente: historial de solicitudes
- Panel de técnico: gestión de trabajos asignados
- Panel de admin: aprobación de técnicos, gestión de categorías, estadísticas
- Command palette global (`Ctrl+K`)
- Middleware de autenticación por rol

## Estructura del proyecto

```
src/
├── components/       # Componentes React (Navbar, LoginForm, EmojiPicker, etc.)
├── data/             # Mock data temporal (mockTecnicos.ts)
├── layouts/          # Layout base con estilos globales
├── lib/              # Cliente Supabase, tipos, utils
├── middleware.ts     # Protección de rutas por rol
├── pages/
│   ├── index.astro
│   ├── login.astro
│   ├── registro.astro
│   ├── como-funciona.astro
│   ├── solicitud.astro
│   ├── tecnicos/
│   └── dashboard/    # cliente, tecnico, admin
└── styles/
    └── global.css    # Tokens de diseño (Tailwind v4 @theme)

public/
├── images/           # Avatar del mascota (taita-avatar.webp)
└── favicon.svg

supabase/
└── rls_policies.sql  # Políticas de Row Level Security
```

## Variables de entorno

Crear un archivo `.env` en la raíz con:

```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
# Service role key (Supabase → Project Settings → API). Nunca exponer al cliente ni commitear.
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Resend (notificaciones por email). Si se deja vacío, el envío se omite sin romper la app.
RESEND_API_KEY=tu_resend_api_key
RESEND_FROM_EMAIL=Taita Soluciones <onboarding@resend.dev>
PUBLIC_SITE_URL=http://localhost:4321

# Protege /api/cron/actualizar-estados. Si se deja vacío, el endpoint queda sin proteger.
CRON_SECRET=un_secreto_random
```

## Comandos

Este proyecto usa **pnpm** exclusivamente (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml` en la
raíz) — no usar `npm install` ni `npm run ...`, se puede desincronizar el lockfile.

| Comando          | Acción                                      |
| :---------------- | :------------------------------------------ |
| `pnpm install`     | Instala dependencias                        |
| `pnpm run dev`     | Servidor de desarrollo en `localhost:4321`  |
| `pnpm run build`   | Build de producción en `./dist/`            |
| `pnpm run preview` | Preview del build local                     |

## Roles de usuario

| Rol       | Acceso                          |
| :-------- | :------------------------------ |
| `cliente` | `/dashboard/cliente`            |
| `tecnico` | `/dashboard/tecnico`            |
| `admin`   | `/dashboard/admin`              |

Los técnicos requieren aprobación manual del admin antes de aparecer en la plataforma.

---

Desarrollado por [JOTADEV](https://www.jotadev.com.ar) — Argentina · 2026
