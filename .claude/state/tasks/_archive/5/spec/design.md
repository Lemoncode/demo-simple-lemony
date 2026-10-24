# Diseño — Imágenes de la Villa en el S3 local y manifiesto

## Enfoque

Las 10 imágenes del handoff y su `CREDITOS.md` se copian a `seed/assets/images/` y se
versionan. La fuente de verdad es un manifiesto JSON escrito a mano en `@demo/model`
(`key` + `alt`), que el índice del paquete exporta tipado junto con un helper puro
`buildImageUrl`. Un script TypeScript de `@demo/seed` (`seed/src/upload-images.ts`) lee
el manifiesto, valida todo antes de tocar el S3 y hace un `PutObject` por entrada con
`@aws-sdk/client-s3` en modo path-style. Se lanza con `pnpm seed:images` desde la raíz y
se ejecuta con el **type stripping nativo de Node 24**, sin compilar y sin `tsx`.

El riesgo del PRD (ejecutar TS que importa `@demo/model` sin compilar, con un JSON) se ha
**comprobado en local** (2026-10-24, Node 24.22.1, pnpm 10.19.0, TypeScript 6.0.3) con un
workspace desechable con la misma forma que el repo (ya borrado):

- `node --env-file-if-exists=../.env src/upload-images.ts` ejecuta el script, sigue el
  enlace de pnpm `seed/node_modules/@demo/model` hasta `packages/model/src/index.ts`
  (Node resuelve la ruta real, que no está bajo `node_modules`, así que hace el type
  stripping) y carga el JSON con `import data from './villa-images.json' with { type: 'json' }`.
  Lee el `.env` y no sale ningún aviso.
- `tsc --noEmit` pasa en los dos paquetes con `tsconfig.base.json` más
  `resolveJsonModule`, `allowImportingTsExtensions` y `erasableSyntaxOnly`. Hacen falta
  las extensiones `.ts` en los imports relativos, porque Node no las reescribe.
- Con TypeScript 6, `types` vale `[]` por defecto: sin `@types/node` y
  `"types": ["node"]` en seed, `tsc` falla con `Cannot find name 'process'` (comprobado).
- Contra el RustFS 1.0.3 levantado: `@aws-sdk/client-s3` 3.1156.0 con `forcePathStyle: true`
  y los checksums por defecto del SDK sube bien, el GET anónimo devuelve 200 con el
  `Content-Type` puesto en el PUT, y un segundo PUT sobrescribe. El objeto de prueba se
  borró después. Con el S3 caído, el SDK lanza un `AggregateError` **con `message` vacío**
  (ver Casos límite).

## Spec gate decisions

- **D1 — El script se ejecuta con el type stripping nativo de Node 24, no con `tsx`.** [preference]
  El PRD deja abierto el runner. Comprobado que funciona (ver Enfoque). Se ahorra una
  dependencia y se usa el mismo `node` que ya trae `--env-file-if-exists`. Alternativa:
  `tsx` (admite imports sin extensión y cualquier sintaxis TS, pero es una dependencia más
  y hay que pasarle los flags de Node con `node --import tsx`). Compromiso: el código de
  `@demo/model` y `@demo/seed` solo puede usar sintaxis TS que se borra (nada de `enum`,
  `namespace` ni parameter properties; `erasableSyntaxOnly` lo comprueba) y los imports
  relativos llevan la extensión `.ts`.
- **D2 — `resolveJsonModule`, `allowImportingTsExtensions` y `erasableSyntaxOnly` se añaden a `tsconfig.base.json`, no a cada paquete.** [open]
  Solo `@demo/model` y `@demo/seed` extienden la base (front tiene su propio tsconfig y
  no se toca), y los dos necesitan las tres opciones: seed comprueba los ficheros de
  model cuando los importa. Así no se pueden desalinear.
- **D3 — `@types/node` (`^24.19.2`) como devDependency de seed y `"types": ["node"]` en `seed/tsconfig.json`.** [open]
  Lo exige TypeScript 6 para usar `process`, `node:fs/promises`, etc. (comprobado).
  `@demo/model` no los necesita: no usa nada de Node.
- **D4 — `@aws-sdk/client-s3` fijado a versión exacta `3.1156.0` como dependency de seed.** [preference]
  Última publicada (2026-10-22) y la que se ha probado contra RustFS 1.0.3. Exacta, no
  `^`, porque el SDK publica casi a diario y los checksums por defecto ya han roto antes
  la compatibilidad con S3 no-AWS. Alternativa: `^3.1156.0`.
- **D5 — Nombres: `villaImages`, `VillaImage`, `buildImageUrl`; `packages/model/src/images/villa-images.{json,ts}`; script `seed/src/upload-images.ts`; script `images` en seed; `seed:images` en la raíz = `pnpm --filter @demo/seed images`.** [preference]
  `seed/src/index.ts` (`export {}`) se deja como está.
- **D6 — El manifiesto sigue el orden del handoff: las 7 `photos`, `contactPhotos.desktop`, `contactPhotos.mobile` e `illustration`.** [preference]
  El PRD dice que el orden no se guarda; esto solo fija cómo se escribe el fichero.
  Nadie debe depender de ese orden.
- **D7 — Validaciones previas extra: key de nombre plano y extensión admitida, además de "el fichero existe".** [open]
  El PRD solo pide fallar si falta un fichero. Se añade (R24, R25) porque el PRD fija
  keys planas y un `Content-Type` por extensión: una key con `/` leería fuera de
  `assets/images/` y crearía una key con carpeta, y una extensión desconocida no tiene
  `Content-Type`. Todo se valida antes del primer PUT y se informa de todos los problemas
  a la vez. Alternativa: validar solo existencia.
- **D8 — Subidas en serie; a la primera que falla, el script para.** [open]
  El PRD pide terminar con error y nombrar la key. Parar en la primera evita 10 errores
  iguales cuando el S3 no está levantado. Como cada PUT sobrescribe, relanzar lo arregla.
  Alternativa: subir en paralelo o seguir y listar todas las que fallan.
- **D9 — Una variable vacía (`S3_BUCKET=`) cuenta como no definida y usa el valor por defecto.** [open]
  Igual que hace compose con `${VAR:-default}`.
- **D10 — `buildImageUrl` quita las barras finales de la base y no codifica la key.** [open]
  El PRD dice `S3_PUBLIC_URL` + `/` + key. Quitar la barra final evita `images//x.jpg` si
  alguien pone `S3_PUBLIC_URL=…/images/`. No se usa `encodeURIComponent`: las keys son
  nombres planos sin caracteres especiales.
- **D11 — El script no usa `S3_PUBLIC_URL`; solo muestra las keys.** [open]
  `S3_PUBLIC_URL` es para quien muestra imágenes (front). El script sube con
  `S3_ENDPOINT` y credenciales, así que no lo necesita y no se le añade un valor por
  defecto.
- **D12 — El script no muestra nunca las credenciales (R28).** [open]
  Se muestran el endpoint y el bucket; nunca las claves.
- **D13 — Se añade a la sección "Arranque en local" del README una subsección corta sobre `pnpm seed:images`.** [open]
  El PRD no lo pide. Es una línea de uso, otra sobre `S3_PUBLIC_URL` y una sobre de
  dónde salen las imágenes y que el script nunca borra.

## Ficheros

- `seed/assets/images/{bano,casa-buganvilla,dormitorio,escalera-mar,playa-atardecer,salon,terraza-mar,terraza-pueblo,villa-piscina}.jpg`, `seed/assets/images/villa-atardecer.png` — creados — copia binaria (`cp`) de `~/Downloads/nuevohandoff/public/images/`. (R10)
- `seed/assets/images/CREDITOS.md` — creado — copia tal cual. (R11)
- `packages/model/src/images/villa-images.json` — creado — el manifiesto (ver abajo). (R1–R4, R6)
- `packages/model/src/images/villa-images.ts` — creado — tipo, manifiesto tipado y helper. (R5, R7, R8)
- `packages/model/src/index.ts` — modificado — sustituye `export {}` por los re-exports. (R5, R7)
- `tsconfig.base.json` — modificado — añade `resolveJsonModule`, `allowImportingTsExtensions`, `erasableSyntaxOnly` (D2). (R13, R29)
- `seed/package.json` — modificado — script `images`, dependency `@aws-sdk/client-s3: 3.1156.0`, devDependency `@types/node: ^24.19.2`. (R13, R14, R16)
- `seed/tsconfig.json` — modificado — `compilerOptions.types: ["node"]`. (R29)
- `seed/src/upload-images.ts` — creado — el script. (R12–R28)
- `package.json` (raíz) — modificado — script `seed:images`. (R13)
- `pnpm-lock.yaml` — modificado (lo genera `pnpm i`).
- `.env.example` — modificado — añade `S3_PUBLIC_URL=http://localhost:9000/images`. (R9)
- `README.md` — modificado — subsección de `pnpm seed:images` (D13).

## Funciones / interfaces

### Manifiesto (`villa-images.json`)

Array JSON de objetos `{ "key": string, "alt": string }`, en el orden de D6:

| key                   | alt                                                    |
| --------------------- | ------------------------------------------------------ |
| `terraza-mar.jpg`     | La terraza, asomada al mar                             |
| `villa-piscina.jpg`   | La casa y la piscina                                   |
| `dormitorio.jpg`      | Dormitorio principal                                   |
| `salon.jpg`           | El salón, lleno de luz                                 |
| `terraza-pueblo.jpg`  | Cenas junto al agua                                    |
| `bano.jpg`            | Uno de los baños                                       |
| `playa-atardecer.jpg` | La orilla al atardecer                                 |
| `escalera-mar.jpg`    | Escalera encalada que baja hacia el mar                |
| `casa-buganvilla.jpg` | Fachada encalada con buganvilla                        |
| `villa-atardecer.png` | Ilustración de la villa frente al mar al atardecer     |

(Textos copiados de `design/data/villa.json` del handoff; al escribir el JSON, copiarlos
de nuevo desde allí, no desde esta tabla.)

### `@demo/model`

- `interface VillaImage { readonly key: string; readonly alt: string }` — una entrada. (R2, R5)
- `const villaImages: readonly VillaImage[]` — el JSON importado con
  `import data from './villa-images.json' with { type: 'json' }` y asignado al tipo
  (sin `as`: si el JSON deja de cuadrar con el tipo, `tsc` falla). (R1, R5)
- `buildImageUrl(baseUrl: string, key: string): string` — `baseUrl.replace(/\/+$/, '') + '/' + key`;
  pura. (R7, R8)
- `src/index.ts`: `export type { VillaImage } from './images/villa-images.ts'` y
  `export { villaImages, buildImageUrl } from './images/villa-images.ts'` (con la
  extensión `.ts`, D1).

### Scripts

| Dónde               | Script        | Comando                                                       |
| ------------------- | ------------- | ------------------------------------------------------------- |
| `package.json` raíz | `seed:images` | `pnpm --filter @demo/seed images`                              |
| `seed/package.json` | `images`      | `node --env-file-if-exists=../.env src/upload-images.ts`       |

pnpm ejecuta el script con el directorio de `seed/` como cwd, así que `../.env` es el
`.env` de la raíz.

### `seed/src/upload-images.ts`

Forma (no es código literal):

1. **Configuración**: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`,
   `S3_REGION` desde `process.env`, con `||` al valor por defecto (R15, D9).
2. **Validación previa** (sin red): para cada entrada, comprobar key plana (R24),
   extensión `.jpg`/`.jpeg`/`.png` (comparación sin distinguir mayúsculas) (R25) y que
   existe `assets/images/<key>`, resuelto con `new URL('../assets/images/', import.meta.url)`
   para no depender del cwd (R23). Juntar todos los problemas; si hay alguno, mostrarlos
   por `stderr` y terminar con código 1 sin crear el cliente S3.
3. **Cliente**: `new S3Client({ endpoint, region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } })` (R16).
4. **Subida**: en serie (D8), `readFile` del fichero y
   `PutObjectCommand({ Bucket, Key: key, Body, ContentType })`; después de cada una,
   una línea `subida <key>` (R17–R19, R21).
5. **Fin**: si todo ha ido bien, `<n> imágenes subidas al bucket <bucket> (<endpoint>)` y
   código 0 (R21). Si un PUT falla: mensaje por `stderr` `No se pudo subir <key>: <causa>`,
   sin más subidas, `process.exitCode = 1`, sin resumen (R26, R27).
6. Nunca llama a `DeleteObject`, `ListObjects` ni nada que no sea `PutObject` (R20).

La causa del error se monta con `name`, `Code` / `$metadata.httpStatusCode` si existen, y
`message`; si es un `AggregateError`, también los `code` de sus `errors` (por ejemplo
`ECONNREFUSED`). Así nunca sale un mensaje vacío.

## Casos límite

- **S3 caído** → el SDK reintenta (3 intentos por defecto) y lanza un `AggregateError` con
  `message` vacío (comprobado). El mensaje se monta como en el apartado anterior; código
  distinto de 0, nombra la key. (R26)
- **Bucket inexistente o credenciales malas** (por ejemplo `.env` con otro `S3_BUCKET`) →
  `NoSuchBucket` / `AccessDenied` en el primer PUT → igual que arriba. (R26)
- **Varios ficheros faltan** → se nombran todos y no se sube nada. (R23)
- **Script lanzado desde otro directorio** (`node seed/src/upload-images.ts`) → las rutas
  de assets se resuelven desde `import.meta.url`, así que funciona. El `.env` solo se lee
  vía `pnpm seed:images`; sin él se usan los valores por defecto. (R14, R15)
- **Objetos ajenos al manifiesto en el bucket** → no se tocan. (R20)
- **Choque de keys planas** (riesgo aceptado en el PRD): un objeto con el mismo nombre
  que suba otro proceso se sobrescribe. No se mitiga en esta tarea. (R19)
- **`CREDITOS.md` en la carpeta de assets** → no está en el manifiesto, así que no se
  sube. (R12)
- **Uso futuro desde front**: front ya tiene `allowImportingTsExtensions`, pero no
  `resolveJsonModule`; cuando front importe `@demo/model` tendrá que añadirlo. Queda para
  la tarea de integración (fuera de alcance).

## Pruebas

Sin runner de tests (decisión del PRD). Prueba de humo que el Implementer y el Reviewer
ejecutan:

1. `pnpm i`; `pnpm typecheck` y `pnpm build` → 0. Error de tipos temporal en
   `seed/src/upload-images.ts` → `pnpm typecheck` falla; revertir. (R29, R30)
2. Contenido: `shasum` de `seed/assets/images/*` frente al handoff; comparar los `alt`
   del JSON con `villa.json` (por ejemplo con `node -e`); `grep -rn http packages/model/src`
   vacío. (R1–R4, R6, R10, R11)
3. Helper: `node -e "import('@demo/model')…"` desde `seed/` (o un `node --input-type=module`
   con import del fichero) con base con y sin `/` final. (R7)
4. `pnpm infra:up`; subir a mano un objeto ajeno (`aws s3api put-object` o un PUT con el
   SDK); `pnpm seed:images` → 0, 10 líneas `subida …` y resumen. (R13, R17, R20, R21)
5. Para cada key: `curl -sI http://localhost:9000/images/<key>` → 200 y `Content-Type`
   correcto; `CREDITOS.md` → 404; el objeto ajeno sigue → 200. (R12, R18, R20)
6. `pnpm seed:images` otra vez → 0. (R19, R22)
7. Renombrar temporalmente un fichero de assets → código distinto de 0, nombra el
   fichero, ninguna línea `subida`; restaurar. Igual con una key con `/` y otra `.gif`
   editadas temporalmente en el JSON. (R23–R25, R27)
8. `pnpm infra:down`; `pnpm seed:images` → código distinto de 0, nombra
   `terraza-mar.jpg` y la causa (no vacía), sin resumen; `pnpm infra:up`. (R26, R27)
9. `.env` temporal con `S3_BUCKET=no-existe` → falla con `NoSuchBucket` (prueba R14); borrar
   el `.env`. Revisar que ninguna salida contiene `rustfsadmin`. (R14, R28)

No se prueba: front (no consume nada todavía) ni el rendimiento de la subida.
