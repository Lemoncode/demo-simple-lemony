# Requisitos — Monorepo (pnpm + Turborepo) e infraestructura local (MongoDB + S3)

> PRD de origen: docs/prds/monorepo-infra-local-2026-10-24.md
> Issue: #2 · Rama: `harness/2-monorepo-infra-local`

Notación EARS en español: _ubicuo_ («El sistema deberá…»), _evento_ («Cuando…, …
deberá…»), _estado_ («Mientras…, … deberá…»), _opcional_ («Donde…, … deberá…») y
_no deseado_ («Si…, entonces … deberá…»).

## 1. Workspace pnpm único (HU 1)

- **R1** (ubicuo): El repositorio deberá tener un único `pnpm-workspace.yaml`, en la raíz, cuyo `packages` incluya exactamente `front`, `seed` y `packages/*`.
- **R2** (ubicuo): El repositorio deberá tener un único lockfile, `pnpm-lock.yaml` en la raíz; `front/pnpm-workspace.yaml`, `front/pnpm-lock.yaml` y `package-lock.json` no deberán existir.
- **R3** (ubicuo): El `pnpm-workspace.yaml` de la raíz deberá declarar como builds permitidos `esbuild` y `lightningcss` (claves `allowBuilds` y `onlyBuiltDependencies`), y `front/package.json` no deberá tener campo `pnpm`.
- **R4** (ubicuo): El `package.json` de la raíz deberá ser `private`, declarar `packageManager` con pnpm 10 y mantener `@lemoncode/lemony` (`^0.11.0`) como devDependency.
- **R5** (evento): Cuando se ejecute `pnpm i` en la raíz, el proceso deberá terminar con código 0 e instalar las dependencias de `front`, `@demo/model` y `@demo/seed`.
- **R6** (evento): Cuando termine `pnpm i` en la raíz, `node_modules/.bin/lemony` deberá existir en la raíz y `node_modules/.bin/lemony --version` deberá terminar con código 0 informando una versión 0.11.x.

### Criterios de aceptación

- [ ] `find . -name pnpm-lock.yaml -not -path '*/node_modules/*'` devuelve solo `./pnpm-lock.yaml`; no hay `package-lock.json` ni `front/pnpm-workspace.yaml`.
- [ ] `pnpm i` en la raíz termina con código 0 sin avisos de builds bloqueados de esbuild/lightningcss.
- [ ] `node_modules/.bin/lemony --version` funciona tras `pnpm i`.

## 2. Front sigue funcionando igual (HU 3)

- **R7** (ubicuo): `front/tsconfig.json` deberá quedar byte a byte igual que en `main`.
- **R8** (ubicuo): `front/package.json` deberá conservar su `name` (`front`), sus dependencias y sus scripts `dev`, `build`, `preview` y `generate-routes` sin cambios; los únicos cambios permitidos son añadir el script `typecheck` y quitar el campo `pnpm`.
- **R9** (ubicuo): `front` no deberá depender de `@demo/model`.
- **R10** (evento): Cuando se ejecute `pnpm --filter front build`, el proceso deberá terminar con código 0.
- **R11** (evento): Cuando se ejecute `pnpm --filter front dev`, front deberá responder HTTP 200 en `http://localhost:3000/`.
- **R12** (evento): Cuando se ejecute `pnpm --filter front preview` tras un build, front deberá servir la app compilada sin errores.

### Criterios de aceptación

- [ ] `git diff main -- front/tsconfig.json` está vacío.
- [ ] build, dev (200 en :3000) y preview de front funcionan desde el workspace nuevo.

## 3. Paquete `@demo/model` (HU 4)

- **R13** (ubicuo): `packages/model/package.json` deberá declarar `name: "@demo/model"`, `private: true`, `type: "module"` y `exports` con `"."` apuntando a `./src/index.ts`, sin script `build`.
- **R14** (ubicuo): `packages/model` deberá contener solo `package.json`, `tsconfig.json` (que extiende `../../tsconfig.base.json`) y `src/index.ts` con únicamente un export vacío; no deberá depender de `mongodb` ni de `mongoose`.

## 4. Proyecto `@demo/seed` (HU 5)

- **R15** (ubicuo): `seed/package.json` deberá declarar `name: "@demo/seed"`, `private: true`, `type: "module"` y la dependencia `"@demo/model": "workspace:*"`.
- **R16** (evento): Cuando termine `pnpm i` en la raíz, `seed/node_modules/@demo/model` deberá ser un enlace a `packages/model`.
- **R17** (ubicuo): `seed` deberá contener solo `package.json`, `tsconfig.json` (que extiende `../tsconfig.base.json`) y `src/index.ts`, sin import de `@demo/model` ni lógica de semilla.

## 5. TypeScript compartido

- **R18** (ubicuo): La raíz deberá tener un `tsconfig.base.json` que extiendan `packages/model/tsconfig.json` y `seed/tsconfig.json`, y que `front/tsconfig.json` no extienda.

## 6. Orquestación con Turbo (HU 2)

- **R19** (ubicuo): `turbo.json` deberá declarar exactamente las tareas `dev`, `build` y `typecheck` (ni `lint` ni `test`).
- **R20** (ubicuo): El `package.json` de la raíz deberá tener los scripts `dev`, `build` y `typecheck`, cada uno delegando en `turbo run <tarea>`.
- **R21** (evento): Cuando se ejecute `pnpm typecheck` en la raíz, Turbo deberá ejecutar `tsc --noEmit` en `front`, `@demo/model` y `@demo/seed`, y terminar con código 0.
- **R22** (evento): Cuando se ejecute `pnpm build` en la raíz, Turbo deberá compilar `front` y terminar con código 0.
- **R23** (evento): Cuando se ejecute `pnpm dev` en la raíz, front deberá responder HTTP 200 en `http://localhost:3000/`.
- **R24** (no deseado): Si algún paquete tiene un error de tipos, entonces `pnpm typecheck` deberá terminar con código distinto de 0 indicando el paquete que falla.

### Criterios de aceptación

- [ ] `pnpm typecheck` muestra la tarea en los tres paquetes y termina en 0.
- [ ] Introducir un error de tipos temporal en `seed/src/index.ts` hace fallar `pnpm typecheck` (y se revierte).

## 7. Infraestructura local con docker compose (HU 6, HU 7)

- **R25** (ubicuo): La raíz deberá tener un `docker-compose.yml` con los servicios `mongo`, `s3` y `s3-init`.
- **R26** (ubicuo): El servicio `mongo` deberá usar la imagen `mongo:8`, publicar el puerto 27017, arrancar sin autenticación, guardar los datos en un volumen con nombre y tener un healthcheck que haga `ping`.
- **R27** (ubicuo): El servicio `s3` deberá usar RustFS con la imagen fijada a un tag de versión concreto (nunca `latest`), publicar 9000 (API S3) y 9001 (consola web), guardar los datos en un volumen con nombre y tener un healthcheck sobre el endpoint de salud de la API.
- **R28** (ubicuo): Las credenciales de RustFS deberán salir de `S3_ACCESS_KEY` y `S3_SECRET_KEY`.
- **R29** (evento): Cuando `s3` esté sano, el servicio efímero `s3-init` deberá crear el bucket `${S3_BUCKET}` si no existe y aplicarle una política que conceda a cualquier principal anónimo solo `s3:GetObject` sobre los objetos del bucket.
- **R30** (evento): Cuando se ejecute `pnpm infra:up`, el comando deberá terminar con código 0 solo después de que `mongo` y `s3` estén sanos y `s3-init` haya terminado con código 0.
- **R31** (evento): Cuando `pnpm infra:up` haya terminado, `mongosh mongodb://localhost:27017/demo --eval "db.adminCommand('ping').ok"` deberá devolver 1.
- **R32** (evento): Cuando `pnpm infra:up` haya terminado, un objeto subido al bucket con credenciales deberá poder leerse con un GET HTTP anónimo a `http://localhost:9000/<bucket>/<clave>` (HTTP 200).
- **R33** (no deseado): Si una petición anónima intenta subir, borrar o listar objetos del bucket, entonces RustFS deberá rechazarla (HTTP 403).
- **R34** (no deseado): Si se ejecuta `pnpm infra:up` con la infraestructura ya levantada o con volúmenes existentes, entonces el comando deberá terminar con código 0 y conservar el bucket, su política y los objetos existentes.
- **R35** (no deseado): Si `s3-init` falla (RustFS inaccesible, creación del bucket o política rechazadas), entonces `pnpm infra:up` deberá terminar con código distinto de 0.
- **R36** (no deseado): Si `mongo` o `s3` no llegan a estar sanos, entonces `pnpm infra:up` deberá terminar con código distinto de 0.
- **R37** (evento): Cuando se ejecute `pnpm infra:down`, todos los contenedores del compose deberán pararse y eliminarse, conservando los volúmenes con nombre, de modo que el siguiente `pnpm infra:up` encuentre los datos anteriores.
- **R38** (ubicuo): Ningún script de `package.json` deberá ejecutar `docker compose down -v` ni eliminar volúmenes.

### Criterios de aceptación

- [ ] `pnpm infra:up` termina en 0; `docker compose ps -a` muestra `mongo` y `s3` healthy y `s3-init` exited (0).
- [ ] Ping a Mongo devuelve 1; `head-bucket images` con credenciales termina en 0.
- [ ] Subida con credenciales + GET anónimo → 200; PUT/listado anónimos → 403.
- [ ] Segundo `pnpm infra:up` termina en 0; el objeto subido sigue ahí.
- [ ] `pnpm infra:down` → sin contenedores; `docker volume ls` sigue mostrando los dos volúmenes; tras otro `infra:up` el objeto sigue legible.

## 8. Configuración (HU 8)

- **R39** (ubicuo): La raíz deberá tener un `.env.example` con `MONGODB_URI`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` y `S3_REGION`, con valores iguales a los defaults del compose (`MONGODB_URI=mongodb://localhost:27017/demo`, bucket `images`).
- **R40** (ubicuo): El `.gitignore` de la raíz deberá ignorar `.env`.
- **R41** (estado): Mientras no exista `.env` en la raíz, `docker compose` deberá usar los valores por defecto `${VAR:-default}` y `pnpm infra:up` deberá funcionar igual.
- **R42** (opcional): Donde exista un `.env` en la raíz, `docker compose` deberá usar sus valores (por ejemplo, un `S3_BUCKET` distinto crea ese bucket).

## 9. Documentación (HU 9)

- **R43** (ubicuo): El README de la raíz deberá documentar el arranque de cero (`pnpm i` → `pnpm infra:up` → `pnpm dev`), `pnpm infra:down`, los puertos (3000, 27017, 9000, 9001), la URL y credenciales por defecto de la consola de RustFS, el uso de `.env.example`, y que `docker compose down -v` borra los datos de forma irreversible.
- **R44** (ubicuo): El README deberá conservar todo su contenido previo; la documentación nueva se añade como sección nueva.
