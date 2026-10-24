# Tareas — Página de Inicio de la Villa

## Group 1 — Fotos desde S3: de `@demo/model` al loader de `/` _(riesgo aislado: costura nueva model→front, server function y lectura del `.env` de la raíz, que contiene credenciales del S3 que no deben entrar en front; se cierra con `/` devolviendo las 7 URLs en el HTML del servidor)_ [risk: secrets]

- [ ] **T1 — Tracer: front importa `@demo/model` y Vitest pasa el primer test del cruce lista ↔ manifiesto.**
      `@demo/model: workspace:*` en front, `resolveJsonModule` en su tsconfig; Vitest 5.0.5,
      `vitest.config.ts`, script `test` en front, tarea `test` en `turbo.json` y script `test`
      en la raíz (D5). `api/carousel-photos.ts` con `carouselPhotoKeys`,
      `selectCarouselPhotos` y `resolvePublicBaseUrl`, test primero: orden, `alt` del
      manifiesto, key ausente → `Error` con la key, base por defecto con `undefined` y `''`.
      Sin tocar `packages/model` ni `seed`
      (R64, R65, R66, R68, R70, R77, R78, R79)
- [ ] T2 — `villa.api-model.ts`, `villa.model.ts` (`Photo`), `villa.mapper.ts` y `villa.repository.ts` con sus specs: `src` = `<base>/<key>` con y sin barra final, `alt` y orden conservados; el repositorio (con la server function simulada) devuelve solo `{ src, alt }` (R65, R75, R79)
- [ ] **T3 — Server function y configuración del entorno.**
      `api/villa.api.ts` con `getCarouselPhotosApi` (GET); `vite.config.ts` en forma de
      función con `envDir` en la raíz y la copia de `S3_PUBLIC_URL` a `process.env` solo si
      falta (D3); loader de `/` = `villaRepository.getCarouselPhotos()` con un render mínimo
      provisional de las fotos. Comprobar en `vite dev`: sin `.env` → base por defecto; con
      `.env` en la raíz → su valor; con la variable en el shell → gana el shell
      (R63, R66, R67, R72)
- [ ] T4 — `pnpm build` y `node .output/server/index.mjs` sirven `/` con las URLs; `grep -rl rustfsadmin front/.output/public` no encuentra nada (D13) (R69, R80)

## Group 2 — Tema y primitivos de shadcn _(costura nueva: proyección de tokens a `theme.css` y CLI de shadcn re-apuntado a `common/`, con el hallazgo del paquete `cn`; se cierra con la página en tema Día y `design-tokens validate` en verde)_

- [ ] **T5 — Tema del handoff.**
      `src/styles/theme.css` proyectando `docs/design-tokens.json` (`:root` Día, `.dark`
      Atardecer, `@theme inline`, tokens añadidos); `styles.css` reescrito sin la plantilla,
      con foco visible base y scroll suave bajo `prefers-reduced-motion: no-preference`;
      `__root.tsx` con `lang="es"`, título «Villa Azahar» y Google Fonts; `theme.css` en
      `design_tokens.scan_exclude`. `lemony design-tokens validate` y `contrast` en verde
      (R2, R3, R11, R12, R13, R14, R15, R16)
- [ ] T6 — `components.json` re-apuntado a `#/common/…`; `shadcn add button card sheet carousel` con el CLI; borrar `src/lib/utils.ts` (D2); ajustar cada primitivo en su fichero a los tokens (`04-componentes.md`, UI §5) y sustituir sus textos en inglés (R41, R73, R76)

## Group 3 — Layout común: cabecera, menú móvil y pie _(trivial salvo el foco del `Sheet`; se cierra con la página navegable por anclas en escritorio y móvil)_

- [ ] **T7 — Esqueleto de la página con cabecera de escritorio y pie.**
      `index.tsx` compone `header` › `main` (intro, `#fotos`, `#la-casa`,
      `#disponibilidad`, aún con contenido mínimo) › `footer`; `nav-links.ts`;
      `SiteHeader` (80 px, enlaces, «Reservar», «Contacto» como `<a href="/contacto">`, D8);
      `SiteFooter` en `pine` con 3 columnas y barra inferior; foco en el pie con
      `pine-foreground`; landmarks y un único h1
      (R1, R5, R17, R18, R19, R24, R26, R57, R58, R59, R62)
- [ ] **T8 — Cabecera móvil y `MobileNav`.**
      Botón de menú 44×44 «Abrir menú»; `Sheet` `side="top"` con título oculto «Menú»,
      filas de 52 px sin «Fotos», «Reservar» ancho y «Cerrar menú»; Esc y cerrar devuelven el
      foco; elegir un ancla cierra sin devolver el foco, desplaza y enfoca la sección
      (`tabindex="-1"`); salto instantáneo con movimiento reducido
      (R20, R21, R22, R23, R25, R60, R61)

## Group 4 — Contenido estático: intro, «La casa» y disponibilidad _(trivial: maqueta y textos literales; se cierra con todas las secciones salvo el carrusel ya maquetadas)_

- [ ] T9 — `VillaIntro` y `ContactCard` (rejilla `1fr 400px` en escritorio, apilada en móvil, botón «Ver disponibilidad» solo en móvil), textos de UI §10 con corchetes (R4, R6, R27, R28, R29)
- [ ] T10 — `HouseSection` y `FeatureCard`: 8 características con icono y tono, tabla tono → clases en un solo sitio, 4 columnas en escritorio y 2 compactas en móvil (R51, R52, R53, R54)
- [ ] T11 — Pod `availability`: `AvailabilityPlaceholder` con eyebrow, h2, ayuda y bloque discontinuo de 480/520 px (R55, R56)

## Group 5 — Carrusel _(riesgo aislado: Embla con SSR e hidratación, y la mayor superficie de accesibilidad de la página; se cierra con el carrusel completo en los dos anchos)_

- [ ] **T12 — `PhotoCarousel` de escritorio, sincronizado y sin desajustes de hidratación.**
      Raíz `#fotos` como región (D9), diapositivas etiquetadas, marco 15:8, degradado y pie
      de foto, contador `aria-live`, flechas, miniaturas con outline activo y anillo de foco
      exterior; índice en `useState(0)` actualizado por eventos de Embla (D10);
      `fetchpriority`/`loading`/`decoding`; marcos `muted` con proporción reservada
      (R30, R31, R34, R35, R36, R37, R38, R39, R40, R47, R48)
- [ ] T13 — Variante móvil: marco 6:5 radio 24, sin pie ni degradado, flechas 44 px, contador arriba a la derecha, puntos con área de 44×24 px; carrusel antes de la intro con CSS `order` (R9, R32, R33)
- [ ] T14 — Interacción: flechas en bucle nunca deshabilitadas, swipe, ←/→ con el foco dentro, saltar con miniatura/punto, cambio instantáneo con movimiento reducido (D10) (R42, R43, R44, R45, R46, R49)
- [ ] T15 — Imagen que falla: se oculta la `img` (D14), queda el marco `muted` (y el pie en escritorio) y los controles siguen funcionando; comprobado con el S3 parado (R50)

## Group 6 — Cierre: gates, arquitectura y humo _(trivial: configuración y verificación; se cierra con la prueba de humo completa del diseño)_

- [ ] **T16 — Gates y verificación final.**
      `test` en `gates` de `harness.config.yml` (D12); quitar el render provisional de T3 si
      queda algo; búsqueda de fugas de arquitectura y de nombres del skill de PODS (imports de
      API/mapper fuera de su capa, alias dentro del pod, imports entre pods, sufijos);
      `pnpm typecheck`, `pnpm build`, `pnpm test` en verde; revisión visual a 390 y 1440 px y
      barrido 320–1440 px sin scroll horizontal; axe a 390 y 1440 px
      (R7, R8, R10, R71, R74, R80, R81)
