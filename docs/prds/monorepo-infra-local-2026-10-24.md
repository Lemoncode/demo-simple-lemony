# PRD: Monorepo (pnpm + Turborepo) e infraestructura local (MongoDB + S3)

**Date**: 2026-10-24
**Mode**: co-creation
**Status**: completed

## Problem Statement

El repo tiene una única app TanStack Start en `front/`, gestionada con pnpm y con su
propio `pnpm-workspace.yaml` y `pnpm-lock.yaml`. La raíz tiene un `package.json` con npm
(`package-lock.json`) que solo trae `@lemoncode/lemony` como devDependency.

Hace falta convertirlo en monorepo para alojar:

- un paquete común de modelo de base de datos (`@demo/model`), y
- un proyecto `seed` (`@demo/seed`) que generará la semilla de datos de desarrollo y
  depende de `@demo/model`.

En esta fase **no se modela nada ni se escribe semilla**: solo se crean los proyectos.

También hace falta infraestructura local con docker compose: una base de datos MongoDB y
un emulador de S3 para subir imágenes.

## User Stories

1. Como desarrollador, quiero instalar todo el monorepo con un único `pnpm i` desde la
   raíz, para no tener que entrar en cada carpeta.
2. Como desarrollador, quiero lanzar `pnpm dev`, `pnpm build` y `pnpm typecheck` desde la
   raíz (orquestados por Turbo), para trabajar con todos los paquetes a la vez.
3. Como desarrollador, quiero que `front` siga funcionando exactamente igual que antes
   (dev, build, preview), para que la migración no rompa nada.
4. Como desarrollador, quiero un paquete `@demo/model` vacío y listo para modelar, para
   empezar el modelado en la siguiente fase sin tocar la estructura.
5. Como desarrollador, quiero un proyecto `seed` que declare su dependencia con
   `@demo/model`, para escribir la semilla en la siguiente fase.
6. Como desarrollador, quiero levantar MongoDB y un S3 local con `pnpm infra:up`, y
   pararlos con `pnpm infra:down`, para tener la infraestructura sin instalar nada en
   local.
7. Como desarrollador, quiero que el bucket de imágenes exista y se pueda leer de forma
   anónima nada más levantar la infraestructura, para poder subir y mostrar imágenes sin
   pasos manuales.
8. Como desarrollador, quiero un `.env.example` que documente la configuración, y que
   compose funcione con valores por defecto aunque no haya `.env`.
9. Como desarrollador nuevo, quiero que el README explique cómo arrancar de cero.

## Product / UX Decisions

- **Experiencia de arranque**: `pnpm i` → `pnpm infra:up` → `pnpm dev`, documentado en el
  README — porque es el camino mínimo para un desarrollador nuevo.
- **Sin atajo para borrar datos**: `docker compose down -v` se documenta en el README pero
  no tiene script — porque así no se borran los volúmenes por accidente.

## Technical Decisions

- **Herramienta de monorepo**: pnpm workspaces + Turborepo — porque front ya usa pnpm, y
  Turbo orquesta las tareas en orden de dependencias. Un único `pnpm-workspace.yaml` y un
  único `pnpm-lock.yaml` en la raíz. Se eliminan `front/pnpm-workspace.yaml`,
  `front/pnpm-lock.yaml` y el `package-lock.json` de la raíz. La configuración de builds
  permitidos de front (`allowBuilds`/`onlyBuiltDependencies`: esbuild, lightningcss) pasa
  a la raíz.
- **El harness sigue funcionando**: `@lemoncode/lemony` sigue como devDependency de la
  raíz, ahora instalada con pnpm. Los hooks usan `node_modules/.bin/lemony` en la raíz,
  así que esa ruta tiene que seguir existiendo.
- **Estructura de carpetas**: `front/` se queda donde está, `seed/` va en la raíz (es un
  ejecutable, no una librería) y el modelo va en `packages/model/`. El workspace incluye
  `front`, `seed` y `packages/*`.
- **Nombres de paquete**: `@demo/model` y `@demo/seed`. Son privados y nunca se publican.
  `front` mantiene su nombre actual.
- **Cómo se consume `@demo/model`**: es un paquete interno en TypeScript sin compilar, con
  `exports` apuntando a `src/index.ts` y sin paso de build — porque Vite y tsx leen TS
  directamente y así no hace falta watch ni compilar antes de usarlo.
- **Dependencias entre paquetes**: solo `@demo/seed` → `@demo/model` (`workspace:*`). En
  esta fase front no depende de `@demo/model`.
- **Contenido de `@demo/model`**: solo el esqueleto (`package.json`, `tsconfig.json`,
  `src/index.ts` vacío o con un export vacío). No se elige todavía entre el driver oficial
  `mongodb` y Mongoose.
- **Contenido de `@demo/seed`**: solo el esqueleto (`package.json` con la dependencia
  `workspace:*` a `@demo/model`, `tsconfig.json` y `src/index.ts`). No hay import de prueba
  de model ni lógica de semilla.
- **Tareas de Turbo**: `dev`, `build` y `typecheck`. `typecheck` ejecuta `tsc --noEmit` en
  los tres paquetes; `build` solo hace algo en front. No se declaran `lint` ni `test`
  hasta que existan.
- **TypeScript compartido**: un `tsconfig.base.json` en la raíz que extienden
  `packages/model` y `seed`. El `tsconfig.json` de front no se toca, para no alterar Vite
  ni los alias `#/*`.
- **Emulador de S3**: RustFS (compatible con S3, Apache-2.0, con consola web), con la
  imagen fijada a un tag concreto — porque MinIO ya no publica imágenes community,
  LocalStack exige un token de cuenta y s3mock no tiene consola.
- **Bucket**: `images`, creado por un servicio init efímero en compose (aws-cli o mc) que
  espera a que RustFS esté sano, crea el bucket si no existe y aplica una política de
  **solo lectura anónima**. Es idempotente. Para escribir hacen falta credenciales.
- **MongoDB**: `mongo:8` en el puerto 27017, sin autenticación (solo desarrollo local),
  con volumen con nombre y healthcheck. Base de datos por defecto `demo`
  (`mongodb://localhost:27017/demo`).
- **Configuración**: `.env.example` en la raíz con `MONGODB_URI`, `S3_ENDPOINT`,
  `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` y `S3_REGION`. El `.env` real va en
  `.gitignore`. El compose usa `${VAR:-default}`, así que funciona sin `.env`.
- **Scripts de la raíz**: `dev`, `build` y `typecheck` (vía turbo), más
  `infra:up` (`docker compose up -d --wait`) e `infra:down` (`docker compose down`).

## Testing Decisions

No hay lógica de negocio que probar; la verificación es mecánica y de humo:

- **Workspace**: `pnpm i` en la raíz termina sin errores, deja un único lockfile y
  enlaza `@demo/model` dentro de `seed/node_modules`.
- **Turbo**: `pnpm typecheck` pasa en los tres paquetes; `pnpm build` compila front; con
  `pnpm dev` front responde en el puerto 3000.
- **Harness**: `node_modules/.bin/lemony` sigue existiendo en la raíz.
- **Infraestructura**: con `pnpm infra:up` Mongo y RustFS quedan sanos; Mongo responde
  a un ping; el bucket `images` existe; un objeto subido con credenciales se puede leer
  con un GET anónimo; repetir `infra:up` no falla (el init es idempotente);
  `pnpm infra:down` para todo y conserva los volúmenes.

## Out of Scope

- Modelar entidades o elegir la librería de Mongo (driver o Mongoose).
- Lógica de la semilla y cualquier import real de model desde seed.
- Que front dependa de `@demo/model`.
- Lógica de subida de imágenes en front o en el servidor.
- Linter, tests y CI.
- Configuración de producción (auth de Mongo, S3 real).

## Discarded Alternatives

- **Solo pnpm workspaces sin Turbo**: descartado; el usuario prefiere tener ya la
  orquestación con Turbo.
- **npm workspaces**: descartado, porque obligaría a migrar front de pnpm a npm.
- **`apps/front` y `packages/seed`**: descartado; front se queda donde está y seed va en
  la raíz.
- **Scope `@lemony/*` o sin scope**: descartado; se usa `@demo/*`.
- **Compilar model a `dist/`**: descartado, porque obligaría a compilar antes de usarlo y
  a tener un watch.
- **Import de prueba seed→model**: descartado; seed queda solo como esqueleto.
- **Paquete `@demo/tsconfig` o un tsconfig por paquete**: descartado en favor de
  `tsconfig.base.json`.
- **MinIO / LocalStack / s3mock**: descartados (ver Technical Decisions).
- **Bucket privado con URLs firmadas** y **bucket creado a mano o por la seed**:
  descartados.
- **Mongo con usuario root o como replica set**: descartado por ahora.
- **Configuración fija en el compose**: descartado.

## Assumptions

- Todos los desarrolladores tienen Docker con compose v2 (con soporte de `--wait`) y pnpm 10.
- Los puertos 27017, 9000 (API S3) y 9001 (consola RustFS) están libres en local.
- RustFS acepta los clientes S3 estándar (aws-cli/mc) para crear el bucket y aplicar la
  política anónima.

## Risks

- **RustFS es un proyecto joven**: puede haber cambios incompatibles entre versiones o
  diferencias con S3 (por ejemplo, en las políticas de bucket). Se mitiga fijando el tag
  de la imagen.
- **Migrar el lockfile** puede cambiar las versiones resueltas de front. Hay que
  comprobar que dev y build siguen funcionando.
- **El cambio de npm a pnpm en la raíz** podría afectar a los hooks del harness si
  dependen de npm. Hay que comprobar que `node_modules/.bin/lemony` sigue presente.

## Open Points

- [ ] Elegir entre el driver `mongodb` y Mongoose (fase de modelado).
- [ ] Decidir si front depende de `@demo/model` (cuando lo vaya a usar).
- [ ] Decidir si hace falta un replica set de Mongo (si llegan transacciones o change
      streams).

## Next Steps

- [ ] Pasar el PRD al Spec Author (`prd-to-spec`) para convertirlo en spec.
