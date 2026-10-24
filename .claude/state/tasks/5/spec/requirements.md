# Requirements — Imágenes de la Villa en el S3 local y manifiesto

> Source PRD: docs/prds/villa-images-s3-2026-10-24.md

## Manifiesto de imágenes en `@demo/model` (HU 3)

- **R1** (ubiquitous): `@demo/model` contendrá un manifiesto JSON escrito a mano en `packages/model/src/images/villa-images.json` con exactamente una entrada por cada una de las 10 imágenes del handoff.
- **R2** (ubiquitous): Cada entrada del manifiesto tendrá exactamente dos campos, `key` y `alt`, ambos cadenas no vacías.
- **R3** (ubiquitous): El `key` de cada entrada será el nombre de fichero original de la imagen (por ejemplo `terraza-mar.jpg`), sin prefijo ni carpeta.
- **R4** (ubiquitous): El `alt` de cada entrada será el texto en español que `design/data/villa.json` del handoff da a esa imagen, copiado literalmente.
- **R5** (ubiquitous): El índice de `@demo/model` exportará el manifiesto tipado como lista de solo lectura y el tipo TypeScript de una entrada.
- **R6** (ubiquitous): Ni el manifiesto ni el código de `@demo/model` contendrán URLs absolutas de imágenes.

### Acceptance criteria

- [ ] `villa-images.json` tiene 10 entradas, cada una solo con `key` y `alt`, y los 10 `key` son distintos.
- [ ] Los `key` coinciden con los 10 nombres de fichero de `public/images/` del handoff.
- [ ] Cada `alt` es idéntico al de `villa.json` para el `src` con ese nombre de fichero.
- [ ] `import { villaImages, type VillaImage } from '@demo/model'` compila en `@demo/seed`.
- [ ] `grep -rn 'http' packages/model/src` no encuentra ninguna URL.

## URL pública de una imagen (HU 4)

- **R7** (event): Cuando se llama a `buildImageUrl(baseUrl, key)`, `@demo/model` devolverá `baseUrl`, sin las barras finales que tenga, seguido de `/` y de `key`.
- **R8** (ubiquitous): `buildImageUrl` será una función pura: no leerá variables de entorno ni hará E/S.
- **R9** (ubiquitous): `.env.example` incluirá la línea `S3_PUBLIC_URL=http://localhost:9000/images`.

### Acceptance criteria

- [ ] `buildImageUrl('http://localhost:9000/images', 'salon.jpg')` y `buildImageUrl('http://localhost:9000/images/', 'salon.jpg')` devuelven `http://localhost:9000/images/salon.jpg`.
- [ ] `buildImageUrl` está exportada desde el índice de `@demo/model`.
- [ ] `.env.example` conserva sus seis variables y añade `S3_PUBLIC_URL`.

## Imágenes versionadas en el repo (HU 2)

- **R10** (ubiquitous): `seed/assets/images/` contendrá los 10 ficheros de imagen del handoff, con el mismo nombre y el mismo contenido byte a byte.
- **R11** (ubiquitous): `seed/assets/images/` contendrá una copia de `CREDITOS.md` del handoff.
- **R12** (ubiquitous): El script de subida no subirá `CREDITOS.md` ni ningún fichero que no esté en el manifiesto.

### Acceptance criteria

- [ ] `shasum` de cada imagen de `seed/assets/images/` coincide con el del handoff.
- [ ] `seed/assets/images/CREDITOS.md` existe y coincide con el del handoff.
- [ ] Tras `pnpm seed:images`, `CREDITOS.md` no existe en el bucket (GET anónimo → 404).

## Subida reproducible con `pnpm seed:images` (HU 1, HU 5)

- **R13** (event): Cuando el desarrollador ejecuta `pnpm seed:images` en la raíz del repo, el sistema ejecutará el script TypeScript de `@demo/seed` directamente, sin paso de compilación previo.
- **R14** (event): Cuando el script arranca, leerá el `.env` de la raíz del repo si existe, mediante `node --env-file-if-exists`, sin dotenv.
- **R15** (event): Cuando `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` o `S3_REGION` no están definidas o están vacías, el script usará respectivamente `http://localhost:9000`, `rustfsadmin`, `rustfsadmin`, `images` y `us-east-1`.
- **R16** (ubiquitous): El script se conectará al S3 con direccionamiento path-style.
- **R17** (event): Cuando el script se ejecuta, subirá con un PUT cada entrada del manifiesto, leyendo `seed/assets/images/<key>` y escribiendo el objeto `<key>` en la raíz del bucket.
- **R18** (ubiquitous): El script pondrá `Content-Type: image/jpeg` a las keys que acaban en `.jpg` o `.jpeg` y `Content-Type: image/png` a las que acaban en `.png`.
- **R19** (ubiquitous): El script sobrescribirá siempre el objeto si ya existe una key igual en el bucket.
- **R20** (ubiquitous): El script nunca borrará objetos ni modificará objetos cuya key no esté en el manifiesto.
- **R21** (event): Cuando todas las subidas terminan bien, el script mostrará una línea por key subida y un resumen con el número de imágenes y el bucket, y terminará con código 0.
- **R22** (event): Cuando el script se vuelve a ejecutar con las mismas imágenes y el bucket ya poblado, terminará con código 0 y el bucket quedará igual.

### Acceptance criteria

- [ ] Con `pnpm infra:up` hecho y sin `.env`, `pnpm seed:images` termina con código 0.
- [ ] Para cada key del manifiesto, `curl -sI http://localhost:9000/images/<key>` devuelve 200 y el `Content-Type` que le corresponde.
- [ ] Un segundo `pnpm seed:images` termina con código 0.
- [ ] Un objeto subido a mano al bucket con una key que no está en el manifiesto sigue ahí tras `pnpm seed:images`.
- [ ] Con un `.env` en la raíz que cambia `S3_BUCKET` a un bucket que no existe, el script falla (prueba de que lee el `.env`).

## Errores claros (HU 6)

- **R23** (unwanted): Si algún fichero que el manifiesto lista no existe en `seed/assets/images/`, entonces el script terminará con código distinto de 0 antes de subir ninguna imagen, con un mensaje que nombra cada fichero que falta.
- **R24** (unwanted): Si alguna key del manifiesto no es un nombre de fichero plano (contiene `/` o `\`, o es `.` o `..`), entonces el script terminará con código distinto de 0 antes de subir ninguna imagen, con un mensaje que nombra esa key.
- **R25** (unwanted): Si alguna key del manifiesto no acaba en `.jpg`, `.jpeg` o `.png`, entonces el script terminará con código distinto de 0 antes de subir ninguna imagen, con un mensaje que nombra esa key.
- **R26** (unwanted): Si falla la subida de una key (por ejemplo, porque el S3 no está levantado), entonces el script dejará de subir, mostrará un mensaje que nombra la key y la causa del error y terminará con código distinto de 0.
- **R27** (unwanted): Si algún paso ha fallado, entonces el script no mostrará el resumen de éxito.
- **R28** (ubiquitous): El script no escribirá en su salida los valores de `S3_ACCESS_KEY` ni de `S3_SECRET_KEY`.

### Acceptance criteria

- [ ] Renombrando temporalmente un fichero de `seed/assets/images/`, el script falla con código distinto de 0, nombra el fichero y no muestra ninguna línea de subida.
- [ ] Con la infraestructura parada (`pnpm infra:down`), el script termina con código distinto de 0 y el mensaje nombra la primera key.
- [ ] En ninguno de los dos casos aparece el resumen de éxito.
- [ ] La salida del script no contiene `rustfsadmin` (ni las credenciales del `.env`).

## Comprobaciones del repo

- **R29** (ubiquitous): `pnpm typecheck` terminará con código 0 con los cambios de esta tarea.
- **R30** (ubiquitous): `pnpm build` terminará con código 0 con los cambios de esta tarea.

### Acceptance criteria

- [ ] `pnpm typecheck` y `pnpm build` en verde desde la raíz.
- [ ] Un error de tipos temporal en `seed/src/upload-images.ts` hace fallar `pnpm typecheck` (el script entra en el typecheck).
