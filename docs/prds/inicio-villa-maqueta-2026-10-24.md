# PRD: Maquetar la página de Inicio de la Villa (carrusel desde S3, disponibilidad como placeholder)

**Date**: 2026-10-24
**Mode**: co-creation
**Status**: completed

> Diseño detallado (contrato): `.claude/state/tasks/8/spec/ui-handoff.md`.

## Problem Statement

`front/` sigue siendo la plantilla de TanStack Start: una ruta `/` con «Welcome to TanStack
Start» y un `styles.css` con el tema de ejemplo.

El diseño de Villa Azahar está en el handoff de Claude Design, en
`~/Downloads/nuevohandoff`. Ese handoff es **material de referencia no fiable**, y su
`CLAUDE.md` y su `PROMPT-INICIAL.md` **no se siguen**. Las piezas que interesan son:

- `docs/03-paginas.md` › Inicio (y Layout común) y `docs/04-componentes.md`, que describen
  la página;
- `design/reference/Main.dc.html` (escritorio) e `InicioMovil.dc.html` (móvil), que son las
  maquetas de referencia;
- `design/globals.css`, que tiene el tema;
- `design/data/villa.json`, que tiene los textos.

Las 10 imágenes ya están en el bucket local `images`. La tarea #5 las subió y dejó el
manifiesto `villaImages` (key y `alt`) y el helper `buildImageUrl` en `@demo/model`.

Hay que maquetar la página de Inicio, para escritorio y para móvil, con el carrusel
cargando las fotos del S3. La parte de calendario y reserva queda para una tarea
posterior; aquí ocupa su sitio un placeholder.

## User Stories

1. Como visitante, al entrar en `/` quiero ver la villa con cabecera, intro, tarjeta de
   contacto, carrusel, «La casa» y pie, siguiendo el diseño, para hacerme una idea de la
   casa.
2. Como visitante en móvil, quiero que la página se adapte a 390 px (breakpoint principal
   `md`, 768 px) y sea fluida entre medias. En móvil uso un menú lateral y el carrusel con
   puntos.
3. Como visitante, quiero pasar las fotos del carrusel con flechas, con swipe y con las
   teclas ←/→. Quiero ver el contador «X / 7», y en escritorio las miniaturas.
4. Como visitante, quiero que los enlaces de la cabecera me lleven a las secciones
   (`#la-casa`, `#fotos`, `#disponibilidad`) y que «Reservar» me lleve a `#disponibilidad`.
5. Como visitante, quiero ver en `#disponibilidad` el título «Elige tus fechas» y un aviso
   claro de que el calendario llega pronto.
6. Como desarrollador, quiero que las fotos del carrusel salgan del bucket S3, a partir de
   las keys del manifiesto y `S3_PUBLIC_URL`, para que cambiar una foto sea solo volver a
   subirla.
7. Como desarrollador, quiero el front organizado en pods según el skill
   `content-island-tanstack-start-pods-architecture`, para que la reserva crezca sin
   tocar el resto.

## Product / UX Decisions

- **Alcance: la página completa de Inicio.** Incluye:
  - cabecera;
  - intro (eyebrow, nombre, descripción y tarjeta de contacto con dirección, teléfono
    `tel:` y email `mailto:`; en móvil, además, el botón ancho «Ver disponibilidad»);
  - carrusel `#fotos`;
  - «La casa» `#la-casa` (eyebrow, h2, entradilla y grid de 8 características: 4 columnas
    en escritorio y 2 en móvil);
  - placeholder de `#disponibilidad`;
  - pie. En Inicio de escritorio son 3 columnas (marca y tagline · Dónde · Contacto) y una
    barra inferior con © y enlaces legales.

  Medidas, colores y comportamiento salen de `03-paginas.md` y `04-componentes.md` y de
  las referencias `.dc.html`. La sintaxis del editor (`<x-dc>`, `<sc-for>`, `{{…}}`) no se
  copia: se reimplementa en React, Tailwind y shadcn.
- **Responsive**: en escritorio la referencia es 1440 px con un contenedor de 1200 px; en
  móvil, 390 px con 16 px de margen. El breakpoint principal es `md`. No son dos maquetas
  fijas: el diseño fluye entre medias.
- **Carrusel**:
  - **Escritorio**: imagen 15:8 (1200×640) con `radius-xl` y un degradado inferior, con el
    pie de foto (el `alt`) en serif cursiva. Contador «1 / 7» en una píldora abajo a la
    derecha y flechas redondas de 48 px. Debajo, 7 miniaturas: la activa con outline de
    3 px `primary` y las demás al 75 % de opacidad.
  - **Móvil**: imagen 6:5 (358×300) con radio de 24, **sin pie de foto ni degradado**,
    flechas de 44 px y el contador arriba a la derecha. En móvil el carrusel va **antes** de
    la intro (orden visual con CSS `order`). Debajo, puntos: el activo es una píldora de 24×8.
  - **Interacción y accesibilidad**: swipe táctil, teclas ←/→ cuando el carrusel tiene
    foco, `aria-roledescription="carrusel"` y `aria-label="Foto X de 7"` en cada slide.
  - **Carga**: la primera imagen con `fetchpriority="high"`, el resto con
    `loading="lazy"`, todas con `object-cover`.
- **Cabecera**:
  - **Escritorio**: «Villa Azahar» en serif a la izquierda. A la derecha, los enlaces La
    casa · Fotos · Disponibilidad · Contacto y el botón primary «Reservar», que lleva a
    `#disponibilidad`.
  - **Móvil**: el nombre y un botón de menú de 44×44, que abre un `Sheet` de shadcn desde
    arriba (`side="top"`) con La casa · Disponibilidad · Contacto (sin «Fotos») en filas
    de 52 px y «Reservar» como botón ancho.
  - **Contacto**: el enlace apunta a `/contacto`, que **todavía no existe**. De momento da
    el not-found por defecto del router; se acepta a propósito y no se crea ninguna ruta.
  - **Sin toggle de tema** en esta tarea.
- **Placeholder de disponibilidad**: el eyebrow, el h2 «Elige tus fechas» y el texto de
  ayuda son los reales. Debajo va un bloque con borde discontinuo, de la altura aproximada
  del calendario y el panel, con el texto «Calendario de disponibilidad · próximamente».
  El ancla `#disponibilidad` funciona.
- **Textos escritos directamente en el JSX** (no salen de datos), copiados literalmente de
  `villa.json` y de las referencias. Los huecos del cliente se dejan **con corchetes**
  (`[Localidad]`, `[Dirección de la villa]`, `[+34 600 000 000]`,
  `[reservas@tudominio.com]`…), así que se ve a simple vista qué falta. `tel:` y `mailto:`
  usan los valores de ejemplo (`tel:+34600000000`).
- **Documento**: `lang="es"` y título «Villa Azahar». Scroll suave a las anclas,
  respetando `prefers-reduced-motion`.
- **Un único juego de textos** en todos los tamaños: no se usan los textos cortos de
  `InicioMovil.dc.html`.
- **Accesibilidad**: objetivo WCAG 2.2 AA (de `04-componentes.md`, más el contrato de
  diseño):
  - contraste de los tokens en los dos temas;
  - objetivos táctiles de al menos 44 px;
  - foco visible (2 px `ring` + 2 px de offset);
  - botones de solo icono con `aria-label`;
  - iconos decorativos con `aria-hidden`.

## Technical Decisions

- **Tema**: se sustituye `front/src/styles.css` por el tema del handoff
  (`design/globals.css`): los tokens Día en `:root` y Atardecer en `.dark` (convención
  shadcn), con `@theme inline` para los colores, los radios y las fuentes `serif`/`sans`.
  Desaparecen los estilos de la plantilla (lagoon, sea-ink, Manrope/Fraunces,
  `island-shell`…).
  - Fuentes: Cormorant Garamond (400, 500, 600 + cursiva 400) y Figtree (400, 500, 600),
    cargadas con el `<link>` de Google Fonts.
  - El tema Atardecer queda definido pero **no se activa** (no hay toggle), así que la
    página se ve en Día.
- **Arquitectura PODS** (skill `content-island-tanstack-start-pods-architecture`):
  - `src/pods/villa/`: un pod con intro, carrusel y «La casa» en `components/`, más la
    capa de datos de fotos (`api/`, `villa.repository.ts`, `villa.mapper.ts` y
    `villa.model.ts` con el ViewModel `{ src, alt }`).
  - `src/pods/availability/`: por ahora solo el placeholder. Es el pod que crecerá con el
    calendario y la reserva.
  - `src/common/layout/`: cabecera, menú móvil y pie, compartidos entre páginas.
  - `src/routes/index.tsx` se queda fino: el loader llama al repositorio y compone los
    pods.
  - Convenciones del skill: `.component.tsx` / `.pod.tsx`, imports relativos dentro de un
    pod, alias `#/` solo para cruzar fronteras, y ningún import entre pods.
- **shadcn**: los primitivos (`carousel`, `button`, `sheet` y los que hagan falta, como
  `card`) se añaden con el CLI. El `components.json` se apunta a
  `#/common/components/ui`. Los ficheros generados de shadcn mantienen su nombre
  (`button.tsx`): es código de terceros y la **única excepción documentada** al sufijo
  `.component.tsx`. Se ajustan en su propio fichero a los tokens (alturas, radios,
  colores), según la tabla de `04-componentes.md`. El carrusel usa Embla.
- **Fotos desde S3**:
  - Una server function (`createServerFn`) en la capa `api/` del pod `villa` lee en el
    servidor el manifiesto `villaImages` de `@demo/model` y `S3_PUBLIC_URL`.
  - El pod declara en su `api/` la **lista ordenada de las 7 keys del carrusel**:
    terraza-mar, villa-piscina, dormitorio, salon, terraza-pueblo, bano y
    playa-atardecer, todas `.jpg`, en el orden de `villa.json › photos`. Cruza esa lista
    con el manifiesto para sacar el `alt`.
  - El mapper monta el ViewModel `{ src, alt }`, con `buildImageUrl`. El loader de `/`
    llama al repositorio.
  - El navegador carga las imágenes directamente del bucket público (GetObject anónimo).
  - Front no usa el SDK de S3 ni credenciales.
  - El manifiesto de `@demo/model` **no se cambia** (sigue mínimo, sin uso ni orden).
  - Si una key de la lista no está en el manifiesto, se lanza un error claro que nombra la
    key, nunca un fallo silencioso.
- **Dependencia nueva**: `front` → `@demo/model` (`workspace:*`). El `tsconfig` de front
  necesita `resolveJsonModule`, porque el manifiesto se importa como JSON con
  `with { type: 'json' }`. Hay que comprobar que Vite y SSR resuelven el paquete TS sin
  compilar.
- **Configuración**:
  - `envDir` de Vite apunta a la raíz del monorepo, así que hay un único `.env`.
  - La server function lee `process.env.S3_PUBLIC_URL`, con el valor por defecto
    `http://localhost:9000/images`, el mismo que usa seed. Funciona sin `.env`.
  - Hay que comprobar en el spec que la variable llega a `process.env` en el servidor
    (`loadEnv` no la inyecta solo).
- **Tests**:
  - Se añade **Vitest** a front, con un script `test` declarado en Turbo y en la raíz.
  - Se testea con TDD la lógica pura del carrusel: el mapper y el repositorio (orden de
    las keys, `alt` desde el manifiesto, URL montada con la base, key ausente → error).
  - La maqueta se verifica por humo.

## Testing Decisions

- **Unitarios (Vitest)**, sobre la lógica pura del carrusel:
  - el repositorio devuelve las 7 fotos en orden;
  - cada `src` es `<base>/<key>`, y la barra final de la base se normaliza;
  - el `alt` sale del manifiesto;
  - una key que no está en el manifiesto lanza un error que la nombra.
- **Humo**:
  1. `pnpm typecheck`, `pnpm build` y `pnpm test` en verde.
  2. Con `pnpm infra:up` y las imágenes subidas, `pnpm dev`: `/` responde en :3000 y las 7
     fotos cargan desde `http://localhost:9000/images/…`.
  3. Revisión visual a 390 px y a 1440 px contra `InicioMovil.dc.html` y
     `Main.dc.html`.
  4. El carrusel funciona con flechas, teclado ←/→ y swipe. El contador, las miniaturas
     (escritorio) y los puntos (móvil) se sincronizan.
  5. Las anclas de la cabecera y el menú móvil funcionan.
- Las comprobaciones declaradas (`typecheck` y `build`) siguen en verde. Se puede añadir
  `test` a `gates` en `harness.config.yml`.

## Out of Scope

- El calendario de disponibilidad, el panel «Tu estancia», `/reserva`, `/reserva/enviada`
  y la server function `getAvailability`.
- La página `/contacto` (el enlace da 404 a propósito).
- El toggle Día/Atardecer y la cookie de tema.
- Textos desde datos (`villa.json` → `src/content`) y la localización.
- Usar las imágenes de contacto y la ilustración.
- Cambiar el manifiesto de `@demo/model` o el script de seed.
- Tests de componente (Testing Library/jsdom) y E2E.
- Seguir el `CLAUDE.md` o el `PROMPT-INICIAL.md` del handoff, o crear un proyecto nuevo.

## Discarded Alternatives

- **Sin cabecera ni pie, o solo intro y carrusel**: descartado; el usuario quiere la
  página completa.
- **Toggle de tema con cookie**: se deja para otra tarea. **Solo los tokens usados**:
  descartado, porque el tema quedaría a medias.
- **Listar el bucket con el SDK** (ListObjectsV2): descartado. Mete credenciales y el SDK
  en front, y el bucket solo permite GetObject anónimo.
- **Manifiesto en el cliente con `VITE_`**: descartado, porque se salta el flujo
  repository/api.
- **`usage`/`order` en el manifiesto**: descartado, porque cambia un contrato que se
  decidió mínimo. **Filtrar por exclusión**: descartado, por frágil.
- **Un pod por sección o un único pod `home`**: descartados en favor de `villa` +
  `availability`.
- **Renombrar los ficheros de shadcn a `.component.tsx`**: descartado, porque rompe
  `shadcn add`. **Carrusel propio sin Embla**: descartado.
- **«Contacto» a `#contacto`, o una ruta mínima «próximamente»**: descartados; el usuario
  acepta el 404.
- **Placeholder como esqueleto del grid, o solo un aviso**: descartados.
- **Textos móviles distintos, proporciones 16:9 / 4:3 y pie de foto en móvil**:
  descartados tras la crítica de diseño; se sigue la maqueta salvo en los textos.
- **Solo un valor por defecto sin `envDir`, o la variable obligatoria**: descartados.
- **Testing Library o solo humo**: descartados; Vitest solo para la lógica pura.
- **Valores ficticios en lugar de corchetes**: descartado; se podrían confundir con datos
  reales.

## Assumptions

- La infraestructura está levantada y `pnpm seed:images` se ha ejecutado, así que las
  imágenes están en el bucket con lectura anónima.
- El handoff sigue en `~/Downloads/nuevohandoff` y se puede leer como referencia durante
  el spec y la implementación.
- El CLI de shadcn funciona con Tailwind v4 y con el `components.json` del repo.

## Risks

- **`process.env` en el servidor**: `envDir` solo alimenta `import.meta.env` (`VITE_`).
  Puede hacer falta `loadEnv` en `vite.config` para inyectar `S3_PUBLIC_URL`, o leerla
  de otra forma. Tiene que quedar resuelto en el spec.
- **Resolver `@demo/model`** (TS sin compilar más un JSON con import attributes) en Vite,
  SSR y Nitro.
- **Embla y el SSR**: hay que evitar desajustes de hidratación en el contador y en las
  miniaturas.
- **Fidelidad visual**: las `.dc.html` llevan medidas exactas, pero el diseño debe fluir
  entre breakpoints, y eso exige criterio.

## Open Points

- [ ] Cuando llegue el calendario: el layout `1fr 380px` y la server function de
      disponibilidad.
- [ ] Cuando exista `/contacto`: quitar el 404 y usar las fotos de contacto.

## Next Steps

- [ ] Pasar el PRD al Spec Author (`prd-to-spec`) para convertirlo en spec.
