# PRD: Subir las imágenes de la Villa al S3 local y crear un manifiesto

**Date**: 2026-10-24
**Mode**: co-creation
**Status**: completed

## Problem Statement

El diseño de la web (Villa Azahar) está hecho en Claude Design, que entregó un handoff en
`~/Downloads/nuevohandoff`. Ese paquete trae 10 imágenes en `public/images/`:

- 9 fotos provisionales de Unsplash, con su ID en `CREDITOS.md`;
- la ilustración del cliente `villa-atardecer.png`.

Para qué sirve cada imagen y su `alt` vienen en `design/data/villa.json`:

- carrusel (`photos`, 7, en orden);
- foto de contacto para escritorio y para móvil (`contactPhotos`);
- `illustration`.

El monorepo de la tarea #2 ya tiene un S3 local (RustFS) con el bucket `images` y lectura
anónima, un `@demo/model` vacío y un `@demo/seed` vacío. Faltan dos cosas:

- subir las imágenes de la Villa a ese S3 de forma reproducible;
- dejar en el repo un registro de qué imágenes hay y cuáles son (keys y `alt`), para que
  front las use cuando se integre el diseño.

**Importante:** el handoff trae instrucciones (`CLAUDE.md`, `PROMPT-INICIAL.md`) para
crear un proyecto TanStack Start nuevo con npm. **No se siguen.** El handoff es solo la
fuente de las imágenes y de sus textos `alt`. La integración del diseño con el `front`
existente se hará en otra tarea.

## User Stories

1. Como desarrollador, quiero ejecutar `pnpm seed:images` con la infraestructura levantada
   para que las imágenes de la Villa queden subidas al bucket local.
2. Como desarrollador, quiero que las imágenes originales estén versionadas en el repo,
   para poder volver a subirlas tras un `docker compose down -v` o desde otra máquina.
3. Como desarrollador de front, quiero un manifiesto tipado en `@demo/model` con la key y
   el `alt` de cada imagen, para mostrarlas sin depender de seed.
4. Como desarrollador, quiero montar la URL pública de una imagen a partir de
   `S3_PUBLIC_URL` y su key, para que el mismo manifiesto sirva en cualquier entorno.
5. Como desarrollador, quiero poder relanzar el script sin miedo: sobrescribe y nunca
   borra.
6. Como desarrollador, quiero que el script falle con un error claro si falta un fichero
   o si una subida falla.

## Product / UX Decisions

- **El texto `alt` sale del handoff**: se copia en español, tal cual, de
  `design/data/villa.json`. Es contenido del diseño y no se reescribe.
- **La atribución se conserva**: `CREDITOS.md` (licencia Unsplash) se copia junto a las
  imágenes. No se sube al bucket.

## Technical Decisions

- **Mecanismo**: un script en TypeScript dentro de `@demo/seed`, que usa
  `@aws-sdk/client-s3`. Se lanza con `pnpm seed:images` desde la raíz (script en el
  `package.json` raíz que delega en el paquete seed). Encaja con el propósito de seed
  (datos de desarrollo) y se puede reproducir.
- **Origen de los ficheros**: los 10 ficheros de imagen y `CREDITOS.md` se copian del
  handoff a `seed/assets/images/` y se commitean (unos 4 MB). Las fotos reales del cliente
  sustituirán a estas en ese mismo sitio.
- **Manifiesto**: un JSON escrito a mano que es la fuente de verdad. El script sube
  exactamente lo que dice el manifiesto.
  - **Ubicación**: dentro de `@demo/model`
    (`packages/model/src/images/villa-images.json`, por ejemplo), junto con un tipo TS
    exportado desde el índice del paquete. seed ya depende de model, y front dependerá de
    model, nunca de seed. Esto amplía a propósito el papel de model: pasa a ser modelo
    compartido en general, no solo modelo de base de datos.
  - **Campos mínimos**: `key` y `alt`. No se guarda para qué sirve cada imagen, ni el
    orden, ni los créditos, ni las dimensiones. Eso lo decidirá front al integrar el
    diseño.
  - **Cobertura**: las 10 imágenes.
- **Keys**: planas, en la raíz del bucket, con el nombre de fichero original (por ejemplo
  `terraza-mar.jpg`). Como la key es el nombre del fichero, no hace falta un campo `file`
  aparte.
- **URLs**: el manifiesto guarda solo keys. La URL pública es `S3_PUBLIC_URL` + `/` + key.
  - En local: `S3_PUBLIC_URL=http://localhost:9000/images`, que se añade a `.env.example`.
  - `@demo/model` exporta un helper puro que monta esa URL a partir de una base y una key.
  - No se guarda ninguna URL absoluta en el repo.
- **Subida**: un PUT por cada entrada del manifiesto, que sobrescribe siempre. El
  `Content-Type` se pone según la extensión (`image/jpeg` o `image/png`). Se puede repetir
  sin problema.
- **Objetos que no están en el manifiesto**: no se tocan. El script nunca borra. Para
  empezar de cero está `docker compose down -v`.
- **Configuración**: el script lee el `.env` de la raíz con
  `node --env-file-if-exists=<raíz>/.env`, que trae Node 24, sin dotenv.
  - Si falta una variable, usa los mismos valores por defecto que el compose:
    - `S3_ENDPOINT=http://localhost:9000`;
    - `S3_ACCESS_KEY` / `S3_SECRET_KEY=rustfsadmin`;
    - `S3_BUCKET=images`;
    - `S3_REGION=us-east-1`.
  - Hace falta path-style addressing contra RustFS.
- **Errores**:
  - Si falta en `seed/assets/images/` un fichero que el manifiesto lista, el script falla
    antes de subir nada, con un mensaje que nombra el fichero.
  - Si falla una subida (por ejemplo, porque el S3 no está levantado), el script termina
    con código distinto de 0 y nombra la key.
  - El script nunca informa de éxito si algo ha fallado.
- **Ejecución de TS**: elegir cómo se ejecuta el script (por ejemplo, `tsx` o el type
  stripping nativo de Node) queda para el spec. Hay que comprobar que resuelve el
  `@demo/model` sin compilar y su JSON.

## Testing Decisions

- **Solo prueba de humo**, sin runner de tests (no se añade Vitest en esta tarea):
  1. `pnpm infra:up`.
  2. `pnpm seed:images` termina con código 0.
  3. Para cada key del manifiesto, un GET anónimo a `S3_PUBLIC_URL/<key>` devuelve 200 con
     el `Content-Type` correcto.
  4. Relanzar `pnpm seed:images` también termina con código 0.
  5. Si se renombra un fichero de `assets` temporalmente, el script falla antes de subir.
  6. Con la infraestructura parada, el script termina con código distinto de 0.
- `pnpm typecheck` y `pnpm build` (las comprobaciones declaradas) siguen en verde.

## Out of Scope

- Integrar el diseño en `front`: tema, `globals.css`, tokens, fuentes, páginas y
  componentes.
- Que front dependa de `@demo/model` o muestre imágenes.
- Seguir el `CLAUDE.md` o el `PROMPT-INICIAL.md` del handoff, o crear un proyecto nuevo.
- Copiar al repo el resto del handoff (`docs/`, `design/`).
- Modelar la base de datos o meter datos en Mongo.
- Guardar en el manifiesto para qué sirve cada imagen, su orden, sus créditos o sus
  dimensiones.
- Tests unitarios o Vitest; borrar objetos huérfanos; optimizar o redimensionar
  imágenes.

## Discarded Alternatives

- **Subir desde el init de compose o a mano desde la consola**: descartado. Mezcla datos
  con infraestructura, o no se puede reproducir.
- **Leer las imágenes de una ruta externa o descargarlas de Unsplash**: descartado. No se
  puede reproducir, y la ilustración del cliente no está en Unsplash.
- **Guardar URLs absolutas en el manifiesto, o URL y key**: descartado. Queda atado al
  entorno local.
- **Generar el manifiesto desde el script, o generar además un .md**: descartado. El `alt`
  no se puede deducir del fichero, y sería una pieza más que mantener.
- **Manifiesto en `seed/data` o en un paquete `@demo/content`**: descartado. front no
  puede depender de seed, y un paquete más no compensa todavía.
- **Keys con prefijo `villa/` o con hash de contenido**: descartado por el usuario, que
  prefiere keys planas.
- **Saltar las imágenes que ya existen (HEAD/ETag)**: descartado. Con este volumen no
  compensa.
- **Sincronizar borrando huérfanos**: descartado. Con keys planas borraría cualquier otra
  cosa que haya en el bucket.
- **Vitest con tests unitarios o de integración**: descartado por el usuario en esta
  tarea.
- **Campos `usage`/`order`/`credit` o `width`/`height`**: descartado por el usuario, que
  prefiere un manifiesto mínimo.
- **dotenv, o variables obligatorias sin valores por defecto**: descartado.

## Assumptions

- La infraestructura de la tarea #2 está levantada (`pnpm infra:up`) cuando se ejecuta el
  script, y el bucket `images` existe con lectura anónima.
- Las imágenes del handoff se pueden versionar en el repo (Unsplash con licencia libre;
  la ilustración la aporta el cliente).
- Node 24 está disponible (lo necesita `--env-file-if-exists`).

## Risks

- **Choque de keys planas**: más adelante, imágenes de otro origen (por ejemplo, subidas
  por usuarios) podrían usar el mismo nombre y sobrescribirse entre sí. Por ahora se
  acepta; con un prefijo se arreglaría.
- **Ejecutar TS que importa un paquete TS sin compilar con un JSON**: hay que elegir bien
  el runner y la sintaxis de importación de JSON (import attributes) para que funcionen
  tanto en `tsc --noEmit` como al ejecutar.
- **Tamaño del repo**: unos 4 MB de binarios en git. Es aceptable, pero las fotos reales
  pueden pesar más.

## Open Points

- [ ] Cuando se integre el diseño en front: dónde decidir para qué sirve cada imagen y en
      qué orden (carrusel, contacto, ilustración), y si conviene guardar las dimensiones.
- [ ] Prefijar las keys si llegan imágenes de otros orígenes.

## Next Steps

- [ ] Pasar el PRD al Spec Author (`prd-to-spec`) para convertirlo en spec.
