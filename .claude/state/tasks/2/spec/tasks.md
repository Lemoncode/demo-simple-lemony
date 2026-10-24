# Tareas — Monorepo (pnpm + Turborepo) e infraestructura local (MongoDB + S3)

## Group 1 — Migración a workspace pnpm en la raíz _(riesgo aislado: cambia el gestor de paquetes de la raíz, de la que dependen los hooks del harness (`node_modules/.bin/lemony`), y regenera el lockfile de front; se cierra con front funcionando igual)_

- [ ] **T1 — Workspace pnpm único con front y lemony funcionando.**
      Crear `pnpm-workspace.yaml` raíz (solo `front` de momento existe, pero ya con
      `seed` y `packages/*`), mover `allowBuilds`/`onlyBuiltDependencies`, quitar el campo
      `pnpm` de `front/package.json`, `package.json` raíz con `name`/`private`/`packageManager`,
      borrar `package-lock.json`, `front/pnpm-workspace.yaml`, `front/pnpm-lock.yaml` y
      los `node_modules` de npm y ejecutar `pnpm i` en el mismo comando; añadir
      `.env` y `.turbo` a `.gitignore` (`node_modules` ya está). Verificar lemony, y front dev
      (200 en :3000), build y preview con `--filter front` (R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R40)

## Group 2 — Paquetes `@demo/model` y `@demo/seed` _(esqueletos triviales sin riesgo; se cierra con el enlace workspace visible en `seed/node_modules`)_

- [ ] T2 — `tsconfig.base.json` raíz y paquete `@demo/model` (package.json con `exports` a `src/index.ts`, tsconfig que extiende la base, `src/index.ts` con `export {}`), `tsc --noEmit` pasa en él (R13, R14, R18)
- [ ] T3 — Proyecto `@demo/seed` con `"@demo/model": "workspace:*"`, tsconfig que extiende la base y `src/index.ts` sin imports; tras `pnpm i` existe el enlace `seed/node_modules/@demo/model` (R15, R16, R17, R18)

## Group 3 — Orquestación con Turbo _(nueva costura de orquestación entre los tres paquetes; se cierra con `pnpm dev`/`build`/`typecheck` ejecutables desde la raíz)_

- [ ] T4 — `turbo` como devDependency, `turbo.json` con `dev`/`build`/`typecheck`, scripts raíz `turbo run <t>` y script `typecheck` en front; `pnpm typecheck` pasa en los tres paquetes y falla con un error de tipos temporal (R19, R20, R21, R24)
- [ ] T5 — `pnpm build` compila front y `pnpm dev` sirve front con 200 en :3000 (R22, R23)

## Group 4 — MongoDB y configuración por entorno _(primer servicio de compose y contrato de variables; incluye las credenciales por defecto en `.env.example`)_ [risk: secrets]

- [ ] T6 — `docker-compose.yml` con el servicio `mongo` (mongo:8, 27017, sin auth, volumen `mongo-data`, healthcheck) y `.env.example` con las seis variables; `docker compose up -d --wait mongo` deja Mongo sano y el ping devuelve 1, sin `.env` (R25, R26, R39, R41)

## Group 5 — RustFS, bucket y política anónima _(riesgo aislado: superficie de autorización (lectura anónima), credenciales del S3 y script de shell del init construido con variables de entorno)_ [risk: auth, secrets, shell-process]

- [ ] T7 — Servicio `s3` (RustFS `1.0.3`, 9000/9001, volumen `s3-data`, credenciales desde `S3_ACCESS_KEY`/`S3_SECRET_KEY`, healthcheck `/health`) sano y consola accesible en :9001 (R27, R28)
- [ ] T8 — Servicio `s3-init` (aws-cli 2.31.0) que crea el bucket si no existe y aplica la política solo `s3:GetObject`; subida con credenciales + GET anónimo → 200, PUT/listado anónimos → 403, y un `S3_BUCKET` distinto crea ese bucket (R29, R32, R33, R42)

## Group 6 — Scripts `infra:up` / `infra:down` y README _(toca el ciclo de vida de los volúmenes: `infra:down` no debe borrar datos y ningún script puede usar `down -v`; se cierra con el arranque de cero documentado)_ [risk: data-loss]

- [ ] T9 — Script `infra:up` (`up -d --wait && compose wait s3-init`): termina en 0 solo con todo sano y el init terminado, es idempotente al repetirse, y falla si el init falla o un servicio no llega a sano (R30, R31, R34, R35, R36)
- [ ] T10 — Script `infra:down` (`docker compose down`): para todo, conserva los volúmenes y los datos siguen tras otro `infra:up`; ningún script usa `down -v` (R37, R38)
- [ ] T11 — Sección nueva en el README raíz con el arranque de cero, puertos, consola, `.env.example`, `infra:down` y el aviso de `docker compose down -v`, sin perder el contenido previo (R43, R44)
