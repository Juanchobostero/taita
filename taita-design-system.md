# Taita Soluciones — Design System v1.1

> Documento de referencia para la implementación del rediseño en Astro + Tailwind + Supabase.
> Stack: Astro · React · Tailwind CSS · Supabase
> Actualizado: Mayo 2026

---

## 1. Colores

### Variables CSS (`global.css`)

```css
:root {
  --color-primary:       #1B4D2E;
  --color-primary-hover: #2D6A42;
  --color-primary-light: #4A8C5C;
  --color-primary-pale:  #C8E6C9;
  --color-primary-soft:  #E8F5E9;

  --color-cream:         #F5F0E8;
  --color-cream-dark:    #EDE8DF;

  --color-text-primary:  #1A1A1A;
  --color-text-mid:      #4A4A4A;
  --color-text-muted:    #7A7A7A;

  --color-white:         #FFFFFF;
  --color-footer-bg:     #111111;

  --color-pending-bg:    #FEF3C7;
  --color-pending-text:  #92400E;
  --color-progress-bg:   #DBEAFE;
  --color-progress-text: #1E40AF;
  --color-done-bg:       #E8F5E9;
  --color-done-text:     #1B4D2E;

  --color-admin-bg:      #FEF3C7;
  --color-admin-text:    #92400E;
  --color-client-bg:     #EDE9FE;
  --color-client-text:   #5B21B6;
  --color-tec-bg:        #E8F5E9;
  --color-tec-text:      #1B4D2E;

  --color-danger:        #EF4444;
}
```

### Tokens Tailwind

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4D2E',
          hover:   '#2D6A42',
          light:   '#4A8C5C',
          pale:    '#C8E6C9',
          soft:    '#E8F5E9',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          dark:    '#EDE8DF',
        },
      },
    },
  },
}
```

---

## 2. Tipografía

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| TAITA navbar | Georgia serif | 700 | 18–19px |
| TAITA hero | Georgia serif | 700 | 44px |
| H2 sección | Georgia serif | 700 | 26–28px |
| Tagline | Georgia serif | 400 italic | 13–15px |
| Body | system-ui sans | 400 | 14px |
| Label campo | system-ui sans | 600 | 11px UPPERCASE |
| Badge | system-ui sans | 600 | 11px |

> TAITA siempre en MAYÚSCULAS. Tagline siempre italic en color primary-light.

---

## 3. Logo y mascota

Usar la imagen real recortada del cliente (solo el personaje, fondo transparente).

```tsx
// Tamaños por contexto
// Navbar desktop: 40–42px | Hero: 190–200px | Mobile navbar: 30–36px | Login: 44px

<div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-pale">
  <img src="/images/mascota.png" alt="TAITA" className="w-full h-full object-cover" />
</div>
```

> NO usar SVG dibujado. Usar siempre la imagen PNG con fondo transparente.

---

## 4. Navbar

Layout de 3 columnas fijas (33% / 34% / 33%) para evitar que el search bar aplaste los botones.

```tsx
<nav className="bg-white border-b border-cream-dark h-16 px-8
                grid grid-cols-[1fr_1.1fr_1fr] items-center gap-4">

  {/* Logo */}
  <div className="flex items-center gap-2.5">
    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-pale flex-shrink-0">
      <img src="/images/mascota.png" className="w-full h-full object-cover" />
    </div>
    <div>
      <div className="font-serif font-bold text-primary text-[18px] leading-none tracking-tight">
        TAITA
      </div>
      <div className="text-[8px] text-muted uppercase tracking-widest mt-0.5">soluciones</div>
    </div>
  </div>

  {/* Search */}
  <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2 text-sm text-muted">
    <SearchIcon className="w-4 h-4 flex-shrink-0" />
    <span className="flex-1 truncate">Buscá técnicos, servicios…</span>
    <kbd className="text-[10px] bg-white border border-cream-dark rounded px-1 flex-shrink-0">
      Ctrl+K
    </kbd>
  </div>

  {/* Sin sesión */}
  <div className="flex items-center justify-end gap-3">
    <a href="/tecnicos" className="text-sm text-text-mid">Técnicos</a>
    <a href="/como-funciona" className="text-sm text-text-mid">Cómo funciona</a>
    <button className="bg-primary-soft text-primary rounded-full px-4 py-1.5 text-sm font-semibold">
      Ingresar
    </button>
    <button className="bg-primary text-white rounded-full px-4 py-2 text-sm font-semibold">
      Registrate
    </button>
  </div>

  {/* Con sesión */}
  <div className="flex items-center justify-end gap-3">
    <a href="/tecnicos" className="text-sm text-text-mid">Técnicos</a>
    <a href="/como-funciona" className="text-sm text-text-mid">Cómo funciona</a>
    <div className="flex items-center gap-2 border border-cream-dark rounded-full pr-3 pl-1 py-1 bg-white">
      <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
        CA
      </div>
      <span className="text-sm font-medium text-text-mid">Carlos</span>
      <ChevronDown className="w-3 h-3 text-muted" />
    </div>
  </div>

</nav>
```

> ANTI-PATRÓN: NO usar border en el botón Ingresar — genera doble borde. Usar bg-primary-soft.

---

## 5. Hero (landing)

```tsx
<section className="bg-cream py-12 px-8">
  <div className="flex items-center gap-8 max-w-5xl mx-auto">

    {/* Mascota */}
    <div className="flex-shrink-0">
      <div className="w-48 h-48 rounded-full overflow-hidden">
        <img src="/images/mascota.png" className="w-full h-full object-cover" />
      </div>
    </div>

    {/* Contenido */}
    <div className="flex-1">
      <span className="inline-block bg-primary-soft text-primary border border-primary-pale
                       rounded-full px-3 py-1 text-xs font-medium mb-3">
        📍 Corrientes y zona
      </span>

      <h1 className="font-serif font-bold text-primary text-[44px] leading-none tracking-tight mb-1">
        TAITA
      </h1>

      <p className="font-serif italic text-primary-light text-[15px] mb-3">
        Ayuda confiable, cuando la necesitás.
      </p>

      <p className="text-text-mid text-sm leading-relaxed mb-5 max-w-md">
        Encontrá los mejores técnicos locales para refrigeración, electricidad,
        plomería y más. Rápido, seguro y garantizado.
      </p>

      <div className="flex bg-white rounded-full border border-cream-dark overflow-hidden mb-3 max-w-md">
        <input placeholder="¿Qué servicio necesitás? Ej: Refrigeración"
               className="flex-1 border-none outline-none px-5 py-3 text-sm bg-transparent" />
        <button className="bg-primary text-white px-6 py-3 text-sm font-semibold rounded-r-full">
          Buscar
        </button>
      </div>

      {/* Tags sin borde en contenedor, borde fino en cada tag */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted font-medium">Populares:</span>
        {['Refrigeración', 'Electricidad', 'Plomería', 'Limpieza'].map(tag => (
          <span key={tag} className="text-xs bg-white text-primary border border-primary-pale
                                     rounded-full px-3 py-1 font-medium">
            {tag}
          </span>
        ))}
      </div>
    </div>

  </div>
</section>
```

---

## 6. Botones

```tsx
/* Primario */
<button className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold">

/* Outline — bg-primary-soft evita doble borde */
<button className="bg-primary-soft hover:bg-primary-pale text-primary rounded-full px-5 py-2 text-sm font-semibold">

/* Ghost (sobre fondo oscuro) */
<button className="bg-transparent border border-white/50 text-white rounded-full px-5 py-2 text-sm font-medium">

/* Destructivo */
<button className="bg-red-500 hover:bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold">
```

---

## 7. Categorías — iconos SVG flat

Usar SVGs planos. NO emojis, NO ilustraciones "T" temáticas.

| Categoría | Fondo | Ícono |
|---|---|---|
| Refrigeración | `#EEF6FF` | Copo de nieve `#3B82F6` |
| Electricidad | `#FFFBEB` | Rayo `#FCD34D` + outline `#1B4D2E` |
| Limpieza | `#F0FFF4` | Escoba `#4A4A4A` / `#8B5E3C` |
| Jardinería | `#F0FFF4` | Planta maceta `#4CAF50` / `#2D6A42` |
| Mudanzas | `#FFF8F0` | Caja `#D4A96A` + cinta `#F59E0B` |
| Armado muebles | `#FFF8F0` | Cómoda `#D4A574` / `#C4925A` |
| Pintura | `#FFF5F5` | Paleta multicolor |
| Fumigaciones | `#F0FFF4` | Spray `#4CAF50` |

```tsx
<div className="bg-white rounded-2xl border border-[#D8D4CC] hover:border-primary-hover overflow-hidden flex flex-col">
  <div className="w-full aspect-square flex items-center justify-center bg-[#EEF6FF]">
    <RefrigeracionIcon className="w-16 h-16" />
  </div>
  <div className="py-2.5 px-3 text-center text-[13px] font-semibold text-primary border-t border-[#EEE]">
    Refrigeración
  </div>
</div>

// SVG Refrigeración
export function RefrigeracionIcon() {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <line x1="40" y1="10" x2="40" y2="70" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"/>
      <line x1="10" y1="40" x2="70" y2="40" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"/>
      <line x1="18" y1="18" x2="62" y2="62" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"/>
      <line x1="62" y1="18" x2="18" y2="62" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="40" cy="10" r="4" fill="#3B82F6"/><circle cx="40" cy="70" r="4" fill="#3B82F6"/>
      <circle cx="10" cy="40" r="4" fill="#3B82F6"/><circle cx="70" cy="40" r="4" fill="#3B82F6"/>
      <line x1="28" y1="22" x2="40" y2="10" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
      <line x1="52" y1="22" x2="40" y2="10" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// SVG Electricidad
export function ElectricidadIcon() {
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <polygon points="48,8 22,44 38,44 32,72 58,36 42,36"
               fill="#FCD34D" stroke="#1B4D2E" strokeWidth="3" strokeLinejoin="round"/>
    </svg>
  )
}
```

---

## 8. Responsive Mobile

| Elemento | Desktop | Mobile |
|---|---|---|
| Navbar | 3 cols grid | Logo + hamburger |
| TAITA hero | 44px | 28px |
| Hero layout | mascota izq + texto der | stack vertical centrado |
| Categorías | 4 columnas | 2 columnas |
| Paneles | sidebar + main | bottom nav |
| Login | split 50/50 | header verde curvo + card blanca |

### Bottom nav mobile

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D4D0C8] flex py-2 pb-safe">
  <a className="flex-1 flex flex-col items-center gap-0.5 text-[10px] text-primary font-semibold">
    <HomeIcon className="w-5 h-5" /> Inicio
  </a>
  <a className="flex-1 flex flex-col items-center gap-0.5 text-[10px] text-muted">
    <ToolIcon className="w-5 h-5" /> Técnicos
  </a>
  <a className="flex-1 flex flex-col items-center gap-0.5 text-[10px] text-muted">
    <MessageIcon className="w-5 h-5" /> Mensajes
  </a>
  <a className="flex-1 flex flex-col items-center gap-0.5 text-[10px] text-muted">
    <UserIcon className="w-5 h-5" /> Perfil
  </a>
</nav>
```

### Header mobile login/registro

```tsx
<div className="bg-primary px-5 pt-10 pb-10 text-center">
  <div className="flex items-center justify-center gap-2 mb-4">
    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30">
      <img src="/images/mascota.png" className="w-full h-full object-cover" />
    </div>
    <span className="font-serif font-bold text-white text-base">TAITA</span>
  </div>
  <h1 className="font-serif font-bold text-white text-xl mb-1">Bienvenido de vuelta</h1>
  <p className="text-white/75 text-sm">Ingresá a tu cuenta</p>
</div>
<div className="bg-white rounded-t-2xl -mt-4 px-5 pt-6 pb-4">
  {/* Formulario */}
</div>
```

---

## 9. Rutas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `index.astro` | Público |
| `/tecnicos` | `tecnicos.astro` | Público |
| `/como-funciona` | `como-funciona.astro` | Público |
| `/login` | `login.astro` | Público |
| `/registro` | `registro.astro` | Público |
| `/dashboard/cliente` | `dashboard/cliente.astro` | Rol: cliente |
| `/dashboard/tecnico` | `dashboard/tecnico.astro` | Rol: técnico |
| `/dashboard/admin` | `dashboard/admin.astro` | Rol: admin |
| `/tecnicos/[id]` | `tecnicos/[id].astro` | Público |

---

## 10. Reglas globales

- Fondo de página: siempre `bg-cream` (#F5F0E8)
- Secciones alternas: bg-white y bg-cream
- TAITA: siempre en MAYÚSCULAS en navbar, hero y login
- Tagline: siempre `font-serif italic text-primary-light`
- Mascota: imagen PNG real con fondo transparente — NO SVG a mano
- Categorías: SVGs flat — NO emojis, NO ilustraciones T temáticas
- Botones outline: usar `bg-primary-soft` para evitar doble borde
- Tags populares: borde .5px en cada tag, sin borde en el contenedor
- Hover cards: cambiar border-color a primary-hover, sin sombra
- Serif: solo para TAITA, h1/h2, tagline, títulos paneles
- Texto sobre verde oscuro: text-white o text-white/75

---

*Taita Soluciones — Design System v1.1 — Mayo 2026*
