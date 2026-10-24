# Requirements — Página de Inicio de la Villa (carrusel desde S3, disponibilidad como placeholder)

> Source PRD: docs/prds/inicio-villa-maqueta-2026-10-24.md
> Contrato de diseño: .claude/state/tasks/8/spec/ui-handoff.md (gana sobre las referencias del handoff donde difieren; las secciones se citan como «UI §n»).

## Página y documento (HU 1, HU 2)

- **R1** (ubiquitous): La ruta `/` renderizará, en este orden de DOM, la cabecera, el `main` con la intro (h1), el carrusel `#fotos`, la sección `#la-casa`, la sección `#disponibilidad` y el pie.
- **R2** (ubiquitous): El documento tendrá `<html lang="es">` y el título «Villa Azahar».
- **R3** (ubiquitous): El front no contendrá restos de la plantilla de TanStack Start: ni el texto «Welcome to TanStack Start» ni los estilos de ejemplo (lagoon, sea-ink, Manrope/Fraunces, `island-shell`…).
- **R4** (ubiquitous): Los textos visibles serán los de UI §10, escritos directamente en el JSX y copiados literalmente; los huecos del cliente aparecerán con sus corchetes (`[Localidad]`, `[Dirección de la villa]`, `[Código postal, localidad, provincia]`, `[+34 600 000 000]`, `[reservas@tudominio.com]`, `[CP, localidad]`).
- **R5** (ubiquitous): Los enlaces de teléfono y email de la intro y del pie usarán `tel:+34600000000` y `mailto:reservas@tudominio.com`.
- **R6** (ubiquitous): La página usará un único juego de textos en todos los anchos; los textos cortos de `InicioMovil.dc.html` no se usarán.
- **R7** (state): While el viewport mide `md` (768 px) o más, la página seguirá `Main.dc.html` a 1440 px en medidas, tipografía, espaciado y color, con un contenedor de 1200 px como máximo y un margen lateral `space-8`.
- **R8** (state): While el viewport mide menos de `md`, la página seguirá `InicioMovil.dc.html` a 390 px en medidas, tipografía, espaciado y color, con un margen lateral `space-4`.
- **R9** (state): While el viewport mide menos de `md`, el carrusel se mostrará antes de la intro mediante CSS `order`, sin duplicar nodos del DOM.
- **R10** (ubiquitous): La página no tendrá scroll horizontal en ningún ancho desde 320 px.

### Acceptance criteria

- [ ] `curl -s localhost:3000/` devuelve HTML con `lang="es"`, `<title>Villa Azahar</title>` y las secciones en el orden de R1.
- [ ] `grep -rn "Welcome to TanStack\|lagoon\|sea-ink\|island-shell\|Manrope\|Fraunces" front/src` no encuentra nada.
- [ ] Revisión visual a 390 px y a 1440 px contra las dos referencias (medidas, tipo, espaciado, color); a 320 px y entre 768 y 1200 px no hay scroll horizontal.
- [ ] Los seis huecos con corchetes se ven tal cual; los `href` de teléfono y email son los de R5.
- [ ] A 390 px el carrusel aparece encima de la intro y el h1 sigue antes que el carrusel en el DOM.

## Tema y tokens

- **R11** (ubiquitous): Las variables del tema vivirán en `front/src/styles/theme.css`, que proyectará `docs/design-tokens.json`: los tokens Día en `:root`, los Atardecer en `.dark`, y un bloque `@theme inline` con los colores, los radios y las fuentes `serif`/`sans`, incluidos los tokens añadidos (`pine-foreground`, `pine-muted-foreground`, `photo-caption`, `photo-scrim`, `carousel.thumb-radius`, `carousel.frame-radius-mobile`).
- **R12** (ubiquitous): `front/src/styles.css` contendrá solo los imports (Tailwind, `tw-animate-css`, `theme.css`) y los estilos base del proyecto, sin los estilos de la plantilla.
- **R13** (ubiquitous): La página se verá en el tema Día: ningún código añadirá la clase `.dark` y no habrá toggle de tema.
- **R14** (ubiquitous): El documento cargará con un `<link>` de Google Fonts Cormorant Garamond (400, 500, 600 y cursiva 400) y Figtree (400, 500, 600).
- **R15** (ubiquitous): `lemony design-tokens validate` terminará sin errores, con `front/src/styles/theme.css` en `design_tokens.scan_exclude` de `harness.config.yml` y sin literales de color ni de dimensión en el resto del front.
- **R16** (ubiquitous): `lemony design-tokens contrast` seguirá en verde (47 pares).

### Acceptance criteria

- [ ] `node_modules/.bin/lemony design-tokens validate` y `… contrast` terminan en 0.
- [ ] Ningún elemento del DOM renderizado lleva la clase `dark`.
- [ ] El `<head>` incluye el `<link>` de Google Fonts con las familias y pesos de R14.

## Cabecera y navegación (HU 4)

- **R17** (state): While el viewport mide `md` o más, la cabecera medirá 80 px y mostrará la marca «Villa Azahar» en serif, un `nav` con `aria-label="Principal"` con los enlaces «La casa» → `#la-casa`, «Fotos» → `#fotos`, «Disponibilidad» → `#disponibilidad`, «Contacto» → `/contacto`, y el botón primary «Reservar» → `#disponibilidad`.
- **R18** (ubiquitous): Ningún enlace de la cabecera ni del menú llevará `aria-current`.
- **R19** (ubiquitous): La cabecera no será sticky y tendrá un borde inferior `border`.
- **R20** (state): While el viewport mide menos de `md`, la cabecera medirá 64 px y mostrará la marca y un botón de menú de 44×44 px con `aria-label="Abrir menú"`.
- **R21** (event): When el visitante activa el botón de menú, la página abrirá un `Sheet` de shadcn con `side="top"`, título «Menú» visualmente oculto, filas de 52 px «La casa», «Disponibilidad» y «Contacto», y «Reservar» como botón ancho, con el foco atrapado dentro.
- **R22** (event): When el visitante pulsa Esc o el botón «Cerrar menú», el `Sheet` se cerrará y el foco volverá al botón de menú.
- **R23** (event): When el visitante elige un enlace de ancla en el `Sheet`, el `Sheet` se cerrará sin devolver el foco al botón de menú, la página se desplazará a la sección destino y el foco pasará a esa sección (`tabindex="-1"`).
- **R24** (event): When el visitante activa un enlace de ancla (cabecera, menú, «Reservar» o «Ver disponibilidad»), la página se desplazará con scroll suave a la sección.
- **R25** (state): While el visitante tiene `prefers-reduced-motion: reduce`, el salto a las anclas será instantáneo.
- **R26** (unwanted): If el visitante sigue el enlace «Contacto», then el router mostrará su not-found por defecto; no se creará ninguna ruta `/contacto`.

### Acceptance criteria

- [ ] A 1440 px los cinco destinos de R17 funcionan; «Contacto» acaba en el not-found del router.
- [ ] A 390 px el menú abre desde arriba, sin «Fotos», con filas de 52 px; Tab no sale del `Sheet` mientras está abierto.
- [ ] Esc devuelve el foco al botón de menú; elegir «La casa» cierra el menú, desplaza a `#la-casa` y deja el foco en esa sección.
- [ ] Con «reducir movimiento» activado en el sistema, las anclas saltan sin animación.

## Intro (HU 1, HU 2)

- **R27** (ubiquitous): La intro mostrará el eyebrow en `terracotta`, el h1 «Villa Azahar» en serif display, la descripción y una tarjeta de contacto con dirección, teléfono (`tel:`) y email (`mailto:`), cada uno con su icono Lucide de 20 px en `terracotta` y `aria-hidden`.
- **R28** (state): While el viewport mide `md` o más, la intro será una rejilla `1fr 400px` con la tarjeta junto al nombre (puede apilarse antes si los 400 px no caben).
- **R29** (state): While el viewport mide menos de `md`, la intro se apilará con la tarjeta bajo la descripción y un botón ancho «Ver disponibilidad» que lleva a `#disponibilidad`.

### Acceptance criteria

- [ ] Los textos coinciden con UI §10 › Intro; el botón «Ver disponibilidad» solo es visible por debajo de `md`.

## Carrusel: presentación (HU 3)

- **R30** (ubiquitous): El carrusel mostrará las 7 fotos que entrega el repositorio, en su orden, sin URLs de imagen escritas en el código de los componentes.
- **R31** (state): While el viewport mide `md` o más, el carrusel mostrará un marco 15:8 con `radius-xl` y `object-cover`; un degradado inferior de `photo-scrim` (0 → 60 %, al menos 200 px) con el `alt` de la foto activa en serif cursiva de 28 px y color `photo-caption`; el contador «X / 7» en una píldora de `photo-scrim` abajo a la derecha; flechas redondas de 48 px (`card` + `shadow-md`) centradas en vertical; y debajo una rejilla de 7 miniaturas de 96 px de alto y radio `carousel.thumb-radius`, la activa con un outline de 3 px `primary` y 2 px de separación y las demás al 75 % de opacidad.
- **R32** (state): While el viewport mide menos de `md`, el carrusel mostrará un marco 6:5 con radio `carousel.frame-radius-mobile`, sin pie de foto ni degradado, flechas de 44 px, el contador arriba a la derecha y debajo puntos de 8 px (inactivos en `input`; el activo, una píldora `primary` de 24×8).
- **R33** (ubiquitous): Cada punto tendrá un área de pulsación de 44 px de alto por al menos 24 px de ancho, con 24 px de paso y el punto visual centrado.
- **R34** (ubiquitous): La primera imagen tendrá `fetchpriority="high"`; las demás y todas las miniaturas tendrán `loading="lazy"` y `decoding="async"`.
- **R35** (ubiquitous): Cada diapositiva y cada miniatura reservarán su proporción con fondo `muted`, de modo que la carga de las imágenes no desplace el layout.
- **R36** (ubiquitous): El elemento raíz del carrusel tendrá `id="fotos"`, será una región etiquetada con `aria-roledescription="carrusel"` y `aria-label="Fotos de la villa"`, y no tendrá encabezado.
- **R37** (ubiquitous): Cada diapositiva tendrá `role="group"` y `aria-label="Foto X de 7"`, sin `aria-roledescription`.
- **R38** (ubiquitous): Las flechas serán botones con `aria-label` «Foto anterior» y «Foto siguiente»; las miniaturas y los puntos serán botones con `aria-label` «Ver foto X: {alt}», y el activo llevará `aria-current="true"`.
- **R39** (ubiquitous): El contador visible tendrá `aria-live="polite"`.
- **R40** (ubiquitous): El foco de una miniatura se dibujará como un anillo `foreground` por fuera del outline activo (unos 5 px de separación), distinguible de él.
- **R41** (ubiquitous): El carrusel no avanzará solo, no tendrá efectos de entrada ni zoom, y ningún texto por defecto en inglés de shadcn («Previous slide», «Next slide», «carousel», «slide», «Close») llegará al DOM.

### Acceptance criteria

- [ ] A 1440 px y 390 px el carrusel coincide con las referencias en proporción, radios, contador, flechas y miniaturas/puntos.
- [ ] El HTML del servidor contiene 7 `img` de diapositiva; la primera con `fetchpriority="high"`, el resto `loading="lazy"`.
- [ ] `grep -rn "Previous slide\|Next slide\|\"carousel\"\|\"slide\"\|>Close<" front/src` no encuentra nada.
- [ ] Un lector de pantalla anuncia «Fotos de la villa, carrusel» y «Foto 1 de 7».

## Carrusel: interacción (HU 3)

- **R42** (event): When el visitante activa «Foto siguiente» o «Foto anterior», el carrusel mostrará la foto siguiente o la anterior, pasando de la última a la primera y al revés.
- **R43** (ubiquitous): Las flechas nunca estarán deshabilitadas.
- **R44** (event): When el visitante desliza el dedo sobre la foto, el carrusel cambiará de foto en la dirección del gesto.
- **R45** (state): While el foco está dentro del carrusel, when el visitante pulsa ← o →, el carrusel mostrará la foto anterior o la siguiente.
- **R46** (event): When el visitante activa una miniatura o un punto, el carrusel saltará a esa foto.
- **R47** (ubiquitous): El contador, las miniaturas y los puntos reflejarán siempre la foto seleccionada por Embla.
- **R48** (ubiquitous): El HTML del servidor representará la foto 1 como seleccionada y la hidratación en el cliente no producirá desajustes.
- **R49** (state): While el visitante tiene `prefers-reduced-motion: reduce`, el cambio de foto será instantáneo o casi.
- **R50** (unwanted): If una imagen no carga, then el carrusel ocultará esa `img` (sin icono de imagen rota ni texto alternativo pintado), mantendrá el marco `muted` (y el pie de foto en escritorio) y seguirá funcionando con contador, flechas, miniaturas y puntos; una miniatura que falla quedará como tesela `muted`.

### Acceptance criteria

- [ ] Flechas, ←/→ con el foco en el carrusel, swipe (emulación táctil) y clic en miniatura/punto cambian de foto y el contador, las miniaturas y los puntos van sincronizados; de 7 → siguiente vuelve a 1.
- [ ] La consola del navegador no muestra avisos de hidratación al cargar `/`.
- [ ] Con el S3 parado, la página se ve sin iconos de imagen rota y el carrusel sigue navegable.

## La casa (HU 1)

- **R51** (ubiquitous): La sección `#la-casa`, etiquetada por su h2, mostrará el eyebrow «La casa» en `muted-foreground`, el h2, la entradilla en `muted-foreground` (dos columnas desde `md`) y una rejilla de 8 tarjetas de característica en el orden, icono y tono de UI §5.
- **R52** (ubiquitous): La correspondencia tono → clases (`terracotta`, `sea`, `sand`) estará definida en un único sitio del código.
- **R53** (state): While el viewport mide `md` o más, la rejilla tendrá 4 columnas (se admite un paso intermedio entre `md` y `lg`), con círculos de icono de 48 px.
- **R54** (state): While el viewport mide menos de `md`, la rejilla tendrá 2 columnas compactas, con círculos de icono de 40 px.

### Acceptance criteria

- [ ] Las 8 tarjetas muestran las cifras/títulos y detalles de UI §10 con el icono y el tono de la tabla de UI §5.

## Disponibilidad (placeholder) (HU 5)

- **R55** (ubiquitous): La sección `#disponibilidad`, etiquetada por su h2, mostrará el eyebrow «Disponibilidad», el h2 «Elige tus fechas» y el texto de ayuda reales.
- **R56** (ubiquitous): Bajo el texto de ayuda habrá un bloque sin interacción con borde discontinuo de 2 px `border`, `radius-lg`, fondo `muted` de baja intensidad, altura mínima de 480 px por debajo de `md` y 520 px desde `md`, y el texto centrado «Calendario de disponibilidad · próximamente» en `muted-foreground`.

### Acceptance criteria

- [ ] `/#disponibilidad` desplaza al bloque; el bloque no contiene ningún elemento enfocable.

## Pie (HU 1)

- **R57** (ubiquitous): El pie tendrá fondo `pine`, texto `pine-foreground` y texto secundario `pine-muted-foreground`, con la marca y el lema, «Dónde» y «Contacto» (teléfono y email como enlaces subrayados en `pine-foreground`), y una barra inferior con «© 2026 Villa Azahar» y «Aviso legal · Privacidad · Cookies» como texto plano.
- **R58** (state): While el viewport mide `md` o más, el pie tendrá 3 columnas y la barra inferior; por debajo de `md`, el mismo contenido apilado.

### Acceptance criteria

- [ ] Los textos del pie coinciden con UI §10 › Footer; los elementos legales no son enlaces.

## Accesibilidad global (HU 1, HU 2)

- **R59** (ubiquitous): Todo elemento interactivo tendrá foco visible de 2 px `ring` con 2 px de separación sobre `background`; en el pie, el foco será `pine-foreground` con separación `pine`.
- **R60** (ubiquitous): Todo objetivo táctil medirá al menos 44 px, salvo los puntos del carrusel (R33).
- **R61** (ubiquitous): Todo botón de solo icono tendrá `aria-label` y todo icono decorativo tendrá `aria-hidden`.
- **R62** (ubiquitous): La página tendrá los landmarks `header`, `nav` «Principal», `main`, la región del carrusel, las secciones `#la-casa` y `#disponibilidad` etiquetadas por su h2, y `footer`, con un único h1.

### Acceptance criteria

- [ ] Recorriendo la página con Tab, cada elemento muestra su foco y ninguno queda oculto (WCAG 2.4.11).
- [ ] Un auditor de accesibilidad (axe) sobre `/` a 390 y 1440 px no reporta violaciones serias ni críticas.

## Fotos desde S3 (HU 6)

- **R63** (ubiquitous): Una server function (`createServerFn`, GET) en `src/pods/villa/api/` leerá en el servidor el manifiesto `villaImages` de `@demo/model` y `S3_PUBLIC_URL`.
- **R64** (ubiquitous): `src/pods/villa/api/` declarará la lista ordenada de las 7 keys del carrusel: `terraza-mar.jpg`, `villa-piscina.jpg`, `dormitorio.jpg`, `salon.jpg`, `terraza-pueblo.jpg`, `bano.jpg`, `playa-atardecer.jpg`.
- **R65** (event): When el loader de `/` pide las fotos, `villaRepository.getCarouselPhotos()` devolverá las 7 fotos como ViewModel `{ src, alt }[]`, en el orden de R64, con `alt` tomado del manifiesto y `src` = `buildImageUrl(<base>, key)` (base sin barras finales).
- **R66** (state): While `S3_PUBLIC_URL` no está definida o está vacía en el proceso del servidor, la base será `http://localhost:9000/images`.
- **R67** (event): When se arranca `pnpm dev` (o `vite dev` en front) y el `.env` de la raíz del monorepo define `S3_PUBLIC_URL` que el entorno del proceso no define, la server function leerá ese valor de `process.env`; si el entorno del proceso ya la define, ganará el entorno.
- **R68** (unwanted): If una key de la lista del carrusel no está en el manifiesto, then se lanzará un `Error` cuyo mensaje nombra esa key, el loader fallará y el error boundary de la ruta lo mostrará; nunca se devolverá una lista parcial.
- **R69** (ubiquitous): El navegador cargará las imágenes directamente de `S3_PUBLIC_URL`; front no dependerá del SDK de S3 ni leerá credenciales, y el bundle de cliente no contendrá los valores de `S3_ACCESS_KEY` ni `S3_SECRET_KEY`.
- **R70** (ubiquitous): El manifiesto de `@demo/model` y el script de seed no cambiarán.

### Acceptance criteria

- [ ] Con `pnpm infra:up` y `pnpm seed:images`, en `/` las 7 fotos cargan desde `http://localhost:9000/images/…` en el orden de R64.
- [ ] Con `S3_PUBLIC_URL=http://x/y/` en el `.env` de la raíz, el HTML de `/` lleva `src="http://x/y/terraza-mar.jpg"`; sin `.env`, lleva la base por defecto.
- [ ] `grep -rl "rustfsadmin" front/.output/public` no encuentra nada tras `pnpm build`.
- [ ] `git diff main -- packages/model seed` está vacío.

## Arquitectura PODS (HU 7)

- **R71** (ubiquitous): El front se organizará así: `src/pods/villa/` (intro, carrusel y «La casa» en `components/`, más `api/`, `villa.repository.ts`, `villa.mapper.ts` y `villa.model.ts`), `src/pods/availability/` (el placeholder) y `src/common/layout/` (cabecera, menú móvil y pie).
- **R72** (ubiquitous): `src/routes/index.tsx` solo declarará el loader (`villaRepository.getCarouselPhotos()`) y compondrá los pods y el layout.
- **R73** (ubiquitous): Los componentes React propios usarán el sufijo `.component.tsx` y las entradas de pod `.pod.tsx`; los primitivos de shadcn en `src/common/components/ui/` mantendrán su nombre generado.
- **R74** (ubiquitous): Dentro de un pod los imports serán relativos; el alias `#/` solo se usará para cruzar fronteras (ruta → pod, pod → common) y no habrá imports entre pods.
- **R75** (ubiquitous): Los modelos de API solo se importarán en `api/`, el mapper y el repositorio, y el mapper solo se invocará desde el repositorio.
- **R76** (ubiquitous): `front/components.json` apuntará `ui` a `#/common/components/ui` y los primitivos (`button`, `card`, `sheet`, `carousel`) se añadirán con el CLI de shadcn y se ajustarán en su propio fichero a los tokens según `04-componentes.md` y UI §5.

### Acceptance criteria

- [ ] `grep -rn "api-model\|villa.mapper\|/api/" front/src --include=*.tsx` solo encuentra imports permitidos (ninguno en componentes, pods ni rutas).
- [ ] `grep -rn "#/pods/villa" front/src/pods/villa` y `grep -rn "#/pods/" front/src/pods` no encuentran nada.
- [ ] Todos los `.tsx` de `front/src` fuera de `routes/` y `common/components/ui/` acaban en `.component.tsx` o `.pod.tsx`.

## Dependencias, tests y comprobaciones

- **R77** (ubiquitous): `front` dependerá de `@demo/model` (`workspace:*`) y su `tsconfig.json` activará `resolveJsonModule`.
- **R78** (ubiquitous): `front` tendrá Vitest con un script `test`; `turbo.json` declarará la tarea `test` y el `package.json` raíz el script `test` (`turbo run test`).
- **R79** (ubiquitous): Habrá tests unitarios de la lógica pura del carrusel que comprueben: las 7 fotos en orden, `src` = `<base>/<key>` con la barra final de la base normalizada, `alt` del manifiesto, la base por defecto y el error que nombra una key ausente.
- **R80** (ubiquitous): `pnpm typecheck`, `pnpm build` y `pnpm test` terminarán en 0 desde la raíz.
- **R81** (ubiquitous): `harness.config.yml` declarará `test` en `gates` además de `typecheck` y `build`.

### Acceptance criteria

- [ ] `pnpm typecheck && pnpm build && pnpm test` terminan en 0.
- [ ] `pnpm test` ejecuta los specs del pod `villa` y todos pasan.
