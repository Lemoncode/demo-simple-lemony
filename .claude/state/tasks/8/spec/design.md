# Diseño — Página de Inicio de la Villa

## Enfoque

`front/` deja de ser la plantilla: el tema del handoff se proyecta desde
`docs/design-tokens.json` a `src/styles/theme.css`, los primitivos de shadcn (`button`,
`card`, `sheet`, `carousel`) se generan con el CLI en `src/common/components/ui/` y se
ajustan a los tokens, y la página `/` se compone con el layout común (`src/common/layout/`)
y dos pods: `villa` (intro, carrusel, «La casa» y la capa de datos de fotos) y
`availability` (el placeholder). Las fotos siguen el flujo obligatorio del skill de PODS:
loader → `villaRepository` → server function de `api/` (lee el manifiesto de `@demo/model`
y `S3_PUBLIC_URL` en el servidor) → mapper → ViewModel `{ src, alt }`. El navegador pide las
imágenes directamente al bucket público. Vitest cubre la lógica pura del carrusel; la
maqueta se verifica por humo contra el contrato de diseño (`ui-handoff.md`), que manda sobre
las referencias.

### Riesgos del PRD, resueltos con hechos comprobados

Comprobado el 2026-10-24 en un worktree desechable del repo (ya borrado), con Node 24.22.1,
pnpm 10.19.0, Vite 8.3.5, TanStack Start 1.169.4, Nitro 3.0.260610-beta y TypeScript 6.0.3.

1. **`S3_PUBLIC_URL` en `process.env`.** Con solo `envDir: '..'`, la server function lee
   `process.env.S3_PUBLIC_URL` = `undefined` en `vite dev` (el `.env` de la raíz solo
   alimenta `import.meta.env` con prefijo `VITE_`; Nitro no lo lee). Con `vite.config.ts` en
   forma de función que llama a `loadEnv(mode, envDir, '')` y copia la variable a
   `process.env` **solo si el proceso no la tiene**, la server function lee el valor del
   `.env` en dev, y una variable del shell (`S3_PUBLIC_URL=… vite dev`) gana sobre el
   fichero. En producción (`node .output/server/index.mjs`) el valor **no queda horneado**
   en el bundle (comprobado con `grep`): se lee de `process.env` en tiempo de ejecución, así
   que sin variable se usa el valor por defecto y con `S3_PUBLIC_URL=… node …` se usa el del
   entorno. Ver D3.
2. **`@demo/model` sin compilar + JSON con import attribute.** Añadida la dependencia
   `@demo/model: workspace:*`, el import funciona sin configuración extra en los tres
   sitios: SSR de `vite dev` (el paquete enlazado vive fuera de `node_modules`, así que Vite
   lo transforma en vez de externalizarlo), `vite build` con Nitro (lo empaqueta) y
   `node .output/server/index.mjs`. `tsc --noEmit` de front también pasa (front ya tiene
   `allowImportingTsExtensions`; TypeScript 6 resuelve el JSON aun sin `resolveJsonModule`,
   pero se activa igualmente porque lo pide el PRD y lo hace explícito). Vitest 5.0.5
   también importa `@demo/model` y su JSON sin configuración extra.
3. **Embla y el SSR.** `useEmblaCarousel` devuelve `api = undefined` en el servidor y en el
   primer render del cliente; Embla solo toca el DOM (transformaciones, bucle) en efectos,
   después de hidratar. No hay desajuste si **ningún valor renderizado depende de la API de
   Embla ni de `matchMedia` durante el render**: el índice seleccionado vive en un
   `useState(0)` que solo cambia en los eventos `select`/`reInit` de Embla, y la preferencia
   de movimiento reducido se lee solo en efectos o manejadores. La carga de la página en el
   navegador sin avisos de hidratación es una comprobación de humo (R48). Ver D10.
4. **CLI de shadcn con `components.json` re-apuntado.** `pnpm dlx shadcn@4.22.1 add button
   card sheet carousel` con `aliases.ui = "#/common/components/ui"` crea los cuatro ficheros
   en `src/common/components/ui/`, resuelve el alias `#/` (por ejemplo
   `import { Button } from "#/common/components/ui/button.tsx"` en `carousel.tsx`) y añade
   `embla-carousel-react` y `radix-ui`. Hallazgo: shadcn 4.22.1 **ya no usa el alias
   `utils`**: los ficheros importan `import { cn } from "cn"` y el CLI instala el paquete
   `cn` (de shadcn, repositorio `shadcn-ui/cn`), con cualquier valor de `aliases.utils`
   (probados `#/lib/utils`, `#/common/lib/utils` y `@/lib/utils`). `tsc` pasa. Ver D2. El CLI
   no tocó `styles.css` con estos cuatro componentes.

## Spec gate decisions

- **D1 — La selección de las 7 keys y el error de key ausente viven en un helper puro de `api/`, y se testean ahí; el test del repositorio simula la server function.** [deviates]
  El PRD pide testear «el mapper y el repositorio» incluida la key ausente. Una
  `createServerFn` no se puede ejecutar en Vitest sin el runtime de Start, así que el
  repositorio se testea con `vi.mock('./api/villa.api')`, y el cruce lista ↔ manifiesto
  (orden, `alt`, error) es una función pura `selectCarouselPhotos(manifest, keys)` en
  `api/carousel-photos.ts`, que la server function llama y que se testea directamente.
  Alternativa: que la server function devuelva el manifiesto entero y el mapper haga el
  cruce (todo testeable en el mapper, pero el error saltaría en el loader del cliente en
  navegaciones y se mandarían 10 entradas al cliente). Compromiso: el error de key ausente
  se prueba en el helper, no a través del repositorio.
- **D2 — Se acepta `import { cn } from "cn"` tal como lo genera shadcn 4.22.1 (paquete `cn` de shadcn) y se borra `src/lib/utils.ts` de la plantilla.** [preference]
  Los ficheros generados no se reescriben (son código de terceros) y el código propio
  también importa `cn` de `"cn"`, para tener una sola implementación. `components.json`
  apunta igualmente `utils` a `#/common/lib/utils` y `lib` a `#/common/lib` por coherencia,
  aunque esta versión del CLI no los use (no se crea el fichero). Alternativa: reescribir el
  import de cada fichero generado a una utilidad propia (se rompe en cada `shadcn add`).
- **D3 — `vite.config.ts` pasa a forma de función: `envDir` = raíz del monorepo y `loadEnv` copia a `process.env` solo `S3_PUBLIC_URL`, y solo si el proceso no la define.** [open]
  Lista blanca de una variable, no todo el `.env`: el `.env` de la raíz lleva credenciales
  del S3 (`S3_ACCESS_KEY`, `S3_SECRET_KEY`) que front no necesita y que así no entran en su
  proceso. Una variable nueva del servidor se añade a la lista. En producción no se carga
  ningún `.env`: se usa el entorno del proceso o el valor por defecto (R66). Alternativa:
  copiar todo el `.env` (más simple, pero mete credenciales en el proceso del front).
- **D4 — Una variable vacía (`S3_PUBLIC_URL=`) cuenta como no definida y usa el valor por defecto.** [open]
  Igual que el seed (D9 de la tarea #5).
- **D5 — Vitest 5.0.5, exacto, como devDependency de front, con su propio `vitest.config.ts` (solo `resolve.tsconfigPaths` y `include: ['src/**/*.spec.ts']`).** [preference]
  Un `vitest.config.ts` evita que Vitest cargue los plugins de Nitro, Start y devtools de
  `vite.config.ts`. Specs junto al fichero, con sufijo `.spec.ts`. Comprobado que funciona
  con Vite 8 y que importar un módulo con `createServerFn` no falla en Vitest.
- **D6 — Nombres: `villaRepository.getCarouselPhotos()`, ViewModel `Photo { src; alt }`, `getCarouselPhotosApi` (server function), `carouselPhotoKeys`, `selectCarouselPhotos`, `resolvePublicBaseUrl`, `mapCarouselPhotosFromApi`; componentes `PhotoCarousel`, `VillaIntro`, `ContactCard`, `HouseSection`, `FeatureCard`, `AvailabilityPlaceholder`, `SiteHeader`, `MobileNav`, `SiteFooter`.** [preference]
  Ficheros en la sección Ficheros. Las entradas de pod son `villa.pod.tsx` (exporta
  `VillaIntroPod`, `VillaPhotosPod`, `VillaHousePod`, porque la ruta intercala el carrusel y
  la intro) y `availability.pod.tsx`.
- **D7 — El spec está en español, como los de las tareas #2 y #5; el código (identificadores) en inglés.** [preference]
- **D8 — «Contacto» es un `<a href="/contacto">` plano, no un `<Link>` del router.** [open]
  El `Link` tipado de TanStack Router no compila con una ruta que no existe. El `<a>` hace
  una petición de documento y el SSR del router pinta su not-found por defecto (R26).
- **D9 — La raíz del carrusel es el `div` de `Carousel` de shadcn con `id="fotos"`, `role="region"`, `aria-roledescription="carrusel"` y `aria-label="Fotos de la villa"`, no un `<section>` envolvente.** [open]
  El contrato pide que la sección *sea* la región del carrusel (un solo elemento). Una
  región con nombre es el mismo landmark que un `<section>` con nombre, y evita dos
  regiones anidadas. `carousel.tsx` se ajusta en su fichero: roledescription en español,
  sin roledescription en las diapositivas, y flechas que no se deshabilitan con `loop`.
- **D10 — El índice seleccionado del carrusel es estado React (`useState(0)`) actualizado por los eventos de Embla; el movimiento reducido se aplica en manejadores con `api.scrollTo(i, true)` (salto) leyendo `matchMedia` en ese momento.** [open]
  Evita leer la API de Embla o `matchMedia` durante el render (fuente típica de desajustes de
  hidratación). Alternativa: opción `duration` de Embla calculada en render (no sirve en el
  primer render del servidor).
- **D11 — El fallo del loader (key ausente) usa el error boundary por defecto de TanStack Router; no se crea `errorComponent` propio.** [open]
  El contrato dice que no hay recuperación diseñada para el visitante (error de desarrollo).
- **D12 — Se añade `test` a `gates` de `harness.config.yml` y `front/src/styles/theme.css` a `design_tokens.scan_exclude`.** [open]
  El PRD dice que «se puede» añadir `test`; aprobar este spec es la confirmación humana que
  pide el comentario del fichero. `scan_exclude` lo pide el contrato de diseño (UI §11).
- **D13 — Se comprueba que el bundle de cliente no contiene credenciales con `grep` sobre `front/.output/public` (R69).** [open]
  El PRD solo dice que front no usa credenciales; la comprobación lo hace observable.
- **D14 — Las imágenes que fallan se ocultan con estado React por imagen (`failed`), dejando de renderizar la `img`, en vez de tocar `style` desde `onError`.** [open]
  Mantiene el render declarativo; el marco `muted` y el resto del carrusel no cambian (R50).

## Ficheros

- `front/package.json` — modificado — dependencias `@demo/model: workspace:*`, `embla-carousel-react`, `radix-ui`, `cn` (las que añade el CLI de shadcn); devDependency `vitest: 5.0.5`; script `test: vitest run`.
- `front/tsconfig.json` — modificado — `resolveJsonModule: true`; quitar el alias `@/*` no es necesario (se deja).
- `front/vite.config.ts` — modificado — forma de función, `envDir` = raíz, inyección de `S3_PUBLIC_URL` (D3).
- `front/vitest.config.ts` — creado — D5.
- `front/components.json` — modificado — aliases `components: #/common/components`, `ui: #/common/components/ui`, `lib: #/common/lib`, `utils: #/common/lib/utils`, `hooks: #/common/hooks`; `tailwind.css` sigue en `src/styles.css`.
- `front/src/lib/utils.ts` — borrado (D2).
- `front/src/styles/theme.css` — creado — proyección de `docs/design-tokens.json` (`:root` Día, `.dark` Atardecer, `@theme inline`), mismos nombres de variable que `design/globals.css` más los tokens añadidos.
- `front/src/styles.css` — reescrito — `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "./styles/theme.css"`, `@layer base` (fondo, color, fuente sans, `:focus-visible`, `scroll-behavior: smooth` dentro de `@media (prefers-reduced-motion: no-preference)`).
- `front/src/routes/__root.tsx` — modificado — `lang="es"`, título «Villa Azahar», `<link>` preconnect + Google Fonts (R14). Las devtools de la plantilla se quedan como están.
- `front/src/routes/index.tsx` — reescrito — loader `() => villaRepository.getCarouselPhotos()`; compone `SiteHeader`, `main` (intro, carrusel, casa, disponibilidad) y `SiteFooter`; el `order` de móvil (R9) se aplica en los contenedores de la página.
- `front/src/common/components/ui/{button,card,sheet,carousel}.tsx` — creados con el CLI y ajustados en su fichero (alturas `h-11`/`lg` 52 px, radios, variantes, textos en español).
- `front/src/common/layout/site-header.component.tsx` — creado — cabecera de escritorio + botón de menú en móvil.
- `front/src/common/layout/mobile-nav.component.tsx` — creado — `Sheet` `side="top"` con el manejo de foco de R21–R23.
- `front/src/common/layout/site-footer.component.tsx` — creado.
- `front/src/common/layout/nav-links.ts` — creado — la lista de enlaces (texto, `href`, si sale en móvil), compartida por cabecera y menú.
- `front/src/pods/villa/villa.pod.tsx` — creado — entradas del pod (D6).
- `front/src/pods/villa/villa.model.ts` — creado — `export interface Photo { src: string; alt: string }`.
- `front/src/pods/villa/villa.mapper.ts` (+ `.spec.ts`) — creado.
- `front/src/pods/villa/villa.repository.ts` (+ `.spec.ts`) — creado.
- `front/src/pods/villa/api/villa.api-model.ts` — creado — `CarouselPhotoApiModel { key; alt }`, `CarouselPhotosApiModel { baseUrl; photos }`.
- `front/src/pods/villa/api/carousel-photos.ts` (+ `.spec.ts`) — creado — `carouselPhotoKeys`, `DEFAULT_S3_PUBLIC_URL`, `selectCarouselPhotos`, `resolvePublicBaseUrl` (puros, sin E/S).
- `front/src/pods/villa/api/villa.api.ts` — creado — `getCarouselPhotosApi` (`createServerFn({ method: 'GET' })`).
- `front/src/pods/villa/components/villa-intro.component.tsx`, `contact-card.component.tsx`, `photo-carousel.component.tsx`, `house-section.component.tsx`, `feature-card.component.tsx` — creados. La tabla tono → clases y la lista de 8 características viven en `house-section.component.tsx` (o un `features.ts` del pod) — un solo sitio (R52).
- `front/src/pods/availability/availability.pod.tsx` y `components/availability-placeholder.component.tsx` — creados.
- `turbo.json` — modificado — tarea `test` (`dependsOn: ["^test"]`, sin `outputs`).
- `package.json` (raíz) — modificado — script `test: turbo run test`.
- `harness.config.yml` — modificado — D12.
- `pnpm-lock.yaml` — modificado.
- Sin cambios: `packages/model/**`, `seed/**`, `docs/design-tokens.json` (salvo que falte un token para una medida exacta; entonces se añade a la vez en el JSON y en `theme.css`, UI §11).

## Funciones / interfaces

- `carouselPhotoKeys: readonly string[]` — las 7 keys en el orden de R64.
- `DEFAULT_S3_PUBLIC_URL = 'http://localhost:9000/images'`.
- `resolvePublicBaseUrl(value: string | undefined): string` — `value` si no es vacío; si no, el valor por defecto (R66, D4).
- `selectCarouselPhotos(manifest: readonly VillaImage[], keys: readonly string[]): CarouselPhotoApiModel[]` — una entrada por key, en el orden de `keys`, con el `alt` del manifiesto; lanza `Error` con un mensaje que contiene la key ausente, antes de devolver nada (R64, R65, R68).
- `getCarouselPhotosApi` — server function GET; handler: `({ baseUrl: resolvePublicBaseUrl(process.env.S3_PUBLIC_URL), photos: selectCarouselPhotos(villaImages, carouselPhotoKeys) })` → `CarouselPhotosApiModel` (R63).
- `mapCarouselPhotosFromApi(api: CarouselPhotosApiModel): Photo[]` — `src = buildImageUrl(api.baseUrl, key)`, `alt` igual; puro (R65).
- `villaRepository.getCarouselPhotos(): Promise<Photo[]>` — llama a la server function y al mapper; único punto de acceso a datos del pod (R65, R72, R75).
- `PhotoCarousel({ photos }: { photos: Photo[] })` — R30–R50.
- `VillaIntroPod`, `VillaPhotosPod({ photos })`, `VillaHousePod`, `AvailabilityPod` — componen los componentes del pod.

## Casos límite

- `S3_PUBLIC_URL` con barra final → `buildImageUrl` la quita (R65).
- `S3_PUBLIC_URL=` vacío o ausente → base por defecto (R66, D4).
- Variable en el shell y en el `.env` → gana el shell (R67).
- Key del carrusel ausente del manifiesto → `Error` con la key; error boundary de la ruta (R68, D11).
- S3 parado o imagen 404 → `img` oculta, marco `muted`, carrusel navegable (R50).
- De la foto 7, «siguiente» → foto 1; de la 1, «anterior» → la 7 (R42).
- ←/→ con el foco fuera del carrusel → no cambia de foto (R45).
- Elegir ancla en el `Sheet` → el cierre no devuelve el foco al botón de menú (evita deshacer el salto) (R23).
- Entre 768 y ~1100 px la rejilla `1fr 400px` puede no caber → se apila antes; las características pueden pasar por 2 o 3 columnas antes de `lg` (R28, R53).
- «Contacto» → not-found del router, a propósito (R26).
- Movimiento reducido → anclas y carrusel sin animación (R25, R49).

## Testing

- **Unitarios (Vitest, TDD)**:
  - `carousel-photos.spec.ts`: 7 entradas en el orden de `carouselPhotoKeys` con el manifiesto real; `alt` igual al del manifiesto; con un manifiesto sin una key, el error contiene esa key; `resolvePublicBaseUrl` con `undefined`, `''` y un valor.
  - `villa.mapper.spec.ts`: `src` = `<base>/<key>` con base con y sin barra final; `alt` se conserva; orden conservado.
  - `villa.repository.spec.ts`: con `vi.mock('./api/villa.api')`, devuelve solo `{ src, alt }` en el orden recibido.
- **No se testea** con tests de componente ni E2E (fuera de alcance del PRD): la maqueta, el carrusel y el menú se verifican por humo.
- **Humo** (con `pnpm infra:up` y `pnpm seed:images`):
  1. `pnpm typecheck`, `pnpm build`, `pnpm test`, `lemony design-tokens validate` y `contrast` en verde.
  2. `pnpm dev`: `/` en :3000, 7 fotos desde `http://localhost:9000/images/…`; consola sin avisos de hidratación.
  3. Revisión visual a 390 y 1440 px contra `InicioMovil.dc.html` y `Main.dc.html`, y barrido entre 320 y 1440 px sin scroll horizontal.
  4. Carrusel con flechas, ←/→, swipe, miniaturas y puntos sincronizados; bucle.
  5. Anclas de cabecera y menú; foco del `Sheet` (Esc, cierre por ancla); movimiento reducido.
  6. S3 parado: sin iconos rotos. `grep -rl rustfsadmin front/.output/public` vacío.
  7. axe sobre `/` a 390 y 1440 px.
