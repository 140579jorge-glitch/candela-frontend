# Candela Design System

Plataforma latina de contenido exclusivo. Warm, intimate, premium. Diseñada para creadoras de Bolivia, Colombia, México y toda Latinoamérica.

---

## 1. Color Palette

### Brand tokens (Tailwind config key → hex)

| Token          | Hex       | Role                                      |
|----------------|-----------|-------------------------------------------|
| `c-bg`         | `#FFF8F5` | Page background — warm white              |
| `c-surf`       | `#FFFBF9` | Card surface, elevated background         |
| `c-accent`     | `#F4A261` | Primary accent, CTAs, highlights          |
| `c-accent-d`   | `#E08947` | Hover/pressed state of accent             |
| `c-rose`       | `#E8A598` | Secondary accent, gradient endpoint       |
| `c-champagne`  | `#F2D5C4` | Icon backgrounds, soft chip fills         |
| `c-text`       | `#2D2D2D` | Body text, headings                       |
| `c-soft`       | `#8B7D77` | Secondary text, labels, placeholders      |
| `c-border`     | `#F0E6E1` | Borders, dividers, idle lines             |

### Gradients

- **Primary CTA:** `linear-gradient(135deg, #F4A261, #E8A598)`
- **Logo text:** `linear-gradient(90deg, #F4A261, #E8A598, #D4869D)`
- **Hero dark:** `linear-gradient(160deg, #1A0A06 0%, #2D1410 50%, #3D1A0A 100%)`
- **Step/badge:** `linear-gradient(135deg, #F4A261, #E8A598)`

### Dark surfaces (hero sections, CTA finals)

Use the Hero dark gradient above. Text on dark: `text-white`, secondary `text-white/60`, borders `border-white/20`.

---

## 2. Typography

### Typefaces

| Role     | Family              | Weights       | Usage                              |
|----------|---------------------|---------------|------------------------------------|
| Display  | Playfair Display    | 600 (normal), 400 italic | H1, H2, logo, hero headings |
| Body/UI  | Nunito              | 400, 500, 600, 700, 800 | All body text, labels, buttons |

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Tailwind config:
```js
fontFamily: {
  display: ["Playfair Display", "serif"],
  body: ["Nunito", "sans-serif"],
}
```

### Type scale

| Element      | Classes                                      |
|--------------|----------------------------------------------|
| Hero H1      | `font-display text-4xl md:text-5xl font-semibold leading-tight` |
| Section H2   | `font-display text-3xl md:text-4xl font-semibold` |
| Card H3      | `font-bold text-base`                        |
| Body         | `text-sm leading-relaxed text-c-soft`        |
| Eyebrow tag  | `text-[11px] font-bold uppercase tracking-widest text-c-accent` |
| Label        | `text-[11px] font-bold text-c-soft uppercase tracking-wider` |
| Caption      | `text-xs text-c-soft`                        |

### Icons

Material Symbols Outlined. Always load:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet">
```

```css
.ms { font-family:'Material Symbols Outlined'; font-style:normal; font-size:22px; line-height:1; user-select:none; }
.ms-fill { font-variation-settings:'FILL' 1; }
```

---

## 3. Components

### Navbar — two variants

**Marketing pages** (gana-con-candela, registro-creadora): floating pill
```html
<header class="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
  <nav class="glass rounded-full border border-c-border/70 shadow-xl shadow-black/5 flex items-center justify-between px-5 w-full max-w-xl" style="height:52px">
    <!-- back arrow | logo | CTA button -->
  </nav>
</header>
```

**App pages** (index, explorar, dashboard): full-width sticky
```html
<header class="glass fixed top-0 w-full z-50 border-b border-c-border">
  <div class="flex items-center justify-between h-16 px-4 md:px-10 max-w-7xl mx-auto">
    <!-- menu | logo | user actions -->
  </div>
</header>
```

Glass utility:
```css
.glass { background: rgba(255,248,245,.90); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
```

### Button — primary CTA

Always `rounded-full`. Never `rounded-lg` or `rounded-xl` for primary CTAs.

```css
.c-btn {
  background: linear-gradient(135deg, #F4A261, #E8A598);
  transition: filter .3s cubic-bezier(.32,.72,0,1), transform .3s cubic-bezier(.32,.72,0,1);
}
.c-btn:hover { filter: brightness(1.07); }
.c-btn:active { transform: scale(.97); }
```

**Button-in-button pattern** (all prominent CTAs must use this):
```html
<a href="..." class="c-btn text-white pl-6 pr-2 py-2 rounded-full font-bold flex items-center gap-3 group">
  Texto del botón
  <span class="w-9 h-9 rounded-full bg-black/15 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
    <span class="ms" style="font-size:16px">arrow_forward</span>
  </span>
</a>
```

### Card — double-bezel (Doppelrand)

Every content card uses nested enclosures. Never a flat `border: 1px solid`.

```html
<div class="benefit-card">       <!-- outer shell -->
  <div class="benefit-card-inner">  <!-- inner core -->
    <!-- content -->
  </div>
</div>
```

```css
.benefit-card {
  background: rgba(242,213,196,.22);
  border: 1px solid rgba(240,230,225,.9);
  border-radius: 2rem;
  padding: 6px;
  transition: transform .6s cubic-bezier(.32,.72,0,1), box-shadow .6s cubic-bezier(.32,.72,0,1);
}
.benefit-card:hover { transform: translateY(-5px); box-shadow: 0 28px 56px rgba(244,162,97,.13); }
.benefit-card-inner {
  background: #fff;
  border-radius: calc(2rem - 6px);
  padding: 1.75rem 1.5rem;
  box-shadow: inset 0 1px 1px rgba(255,255,255,.95);
  height: 100%;
}
```

Same pattern for calculator, form steps, and any feature container.

### Form inputs

```html
<input class="w-full px-4 py-2.5 rounded-xl border border-c-border text-sm focus:outline-none focus:border-c-accent focus:ring-2 focus:ring-orange-100 transition-all">
```

Form cards (wizard steps) use double-bezel:
```css
.form-card-outer { background:rgba(242,213,196,.22); border:1px solid rgba(240,230,225,.9); border-radius:2rem; padding:6px; }
.form-card-inner { background:#fff; border-radius:calc(2rem - 6px); padding:1.5rem; box-shadow:inset 0 1px 1px rgba(255,255,255,.95); }
```

### Step numbers

```css
.step-num {
  width:44px; height:44px; border-radius:50%;
  background: linear-gradient(135deg,#F4A261,#E8A598);
  color:#fff; font-weight:800; font-size:1.1rem;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow: 0 8px 20px rgba(244,162,97,.35);
}
```

### Skeleton loader

```css
@keyframes shimmer { 0%{background-position:-300% 0} 100%{background-position:300% 0} }
.skeleton {
  background: linear-gradient(90deg,#F2D5C4 25%,#FFF0EA 50%,#F2D5C4 75%);
  background-size:300% 100%;
  animation: shimmer 1.6s infinite;
  border-radius:10px;
}
```

---

## 4. Spacing

Minimum section padding on marketing pages: `py-24`. Use `py-10` only for compact utility bars (stats, footer).

| Context           | Classes                    |
|-------------------|----------------------------|
| Section (marketing)  | `py-24 px-4 md:px-10`   |
| Section (app)     | `py-10 px-4 md:px-10`      |
| Card inner        | `p-6` or `1.75rem 1.5rem`  |
| Content container | `max-w-6xl mx-auto`        |
| Narrow content    | `max-w-2xl mx-auto`        |
| Form/wizard       | `max-w-lg mx-auto`         |
| Grid gap          | `gap-5` (cards), `gap-8` (steps) |

---

## 5. Elevation & Depth

| Layer              | Treatment                                          |
|--------------------|----------------------------------------------------|
| Page background    | `bg-c-bg` (#FFF8F5)                                |
| Floating navbar    | `glass` + `shadow-xl shadow-black/5`               |
| Cards              | Double-bezel (see Components). No raw box-shadow.  |
| Modals             | `bg-white rounded-3xl shadow-[0_28px_64px_rgba(0,0,0,.13)]` |
| Hero sections      | Hero dark gradient (feels inset/deep)              |
| CTA result blocks  | `linear-gradient(135deg,#F4A261,#E8A598)` + `box-shadow: 0 12px 32px rgba(244,162,97,.3)` |

**Grain overlay** — apply to every page:
```css
body::before {
  content:''; position:fixed; inset:0; z-index:999; pointer-events:none;
  opacity:.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:256px 256px;
}
```

---

## 6. Motion & Animation

**Rule:** Never use `ease`, `linear`, or `ease-in-out`. All transitions use `cubic-bezier(.32,.72,0,1)`.

```css
/* Standard transition */
transition: all .3s cubic-bezier(.32,.72,0,1);

/* Card hover */
transition: transform .6s cubic-bezier(.32,.72,0,1), box-shadow .6s cubic-bezier(.32,.72,0,1);

/* Reveal */
transition: opacity .75s cubic-bezier(.32,.72,0,1), transform .75s cubic-bezier(.32,.72,0,1), filter .75s cubic-bezier(.32,.72,0,1);
```

**Scroll reveals** — IntersectionObserver only. Never `window.addEventListener('scroll')`.

```css
.reveal { opacity:0; transform:translateY(28px); filter:blur(5px); transition: opacity .75s cubic-bezier(.32,.72,0,1), transform .75s cubic-bezier(.32,.72,0,1), filter .75s cubic-bezier(.32,.72,0,1); }
.reveal.visible { opacity:1; transform:translateY(0); filter:blur(0); }
.reveal-d1 { transition-delay:.1s; }
.reveal-d2 { transition-delay:.18s; }
.reveal-d3 { transition-delay:.26s; }
.reveal-d4 { transition-delay:.34s; }
.reveal-d5 { transition-delay:.42s; }
.reveal-d6 { transition-delay:.5s; }
```

```js
(function(){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
```

**Animate only:** `transform` and `opacity`. Never `top`, `left`, `width`, `height`.

---

## 7. Responsive Behavior

- Mobile-first. All layouts collapse to `w-full` below `md:` (768px).
- Body: `pb-20 md:pb-0` on app pages (bottom nav on mobile).
- Never `h-screen` — use `min-h-screen` or `min-h-[100dvh]`.
- Wide content (tables, code): wrap in `overflow-x: auto`.
- `backdrop-blur` only on fixed/sticky elements (navbar, modals). Never on scrolling containers.
- Grid collapse: `grid-cols-1 md:grid-cols-3`.
- Marketing section padding: `py-24 px-4 md:px-10`.

---

## 8. Visual Guardrails

**Never:**
- Flat `border: 1px solid #F0E6E1` on feature cards — use double-bezel
- `ease-in-out` or `linear` transitions
- Generic `shadow-md` or `rgba(0,0,0,0.3)` shadows
- Full-width sticky navbar on marketing pages — use floating pill
- `backdrop-blur` on scrolling containers
- `window.addEventListener('scroll')` for animations
- Hardcoded `z-[9999]` — use systemic z-index layers (nav: 50, modals: 100, overlays: 200, grain: 999)
- `rounded-lg` on primary CTAs — always `rounded-full`

**Always:**
- Grain overlay on every page
- Button-in-button pattern on all prominent CTAs
- Double-bezel on feature/benefit/form cards
- Scroll reveals on sections below the fold
- `cubic-bezier(.32,.72,0,1)` on all transitions
- Age gate check via `candela_18` in localStorage
- Eyebrow tag (`text-[11px] uppercase tracking-widest`) before H2s on marketing pages

---

## 9. Agent Guidelines

When generating UI for Candela:

1. Read this file first. Apply every rule — no exceptions.
2. Use Tailwind CDN with the Candela config (colors + fonts). Do not introduce new dependencies.
3. Load Material Symbols Outlined and both Google Fonts (Playfair Display + Nunito).
4. Hero sections on marketing pages: Hero dark gradient, white text.
5. Every feature card: double-bezel. No exceptions.
6. Every prominent CTA: button-in-button with arrow circle. `rounded-full` always.
7. Add grain overlay to body::before on every page.
8. Add `reveal` + stagger classes to sections, add IntersectionObserver JS.
9. Marketing pages get floating pill navbar. App pages get full-width glass topbar.
10. After generating: take a Playwright screenshot and verify visually before reporting done.

Screenshot verification script: `C:\Users\RJORGEV\AppData\Local\Temp\claude\...\scratchpad\screenshot.js`
Usage: `node screenshot.js <url> <output.png>`
