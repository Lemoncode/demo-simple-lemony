# Diseño — Monorepo (pnpm + Turborepo) e infraestructura local (MongoDB + S3)

## Enfoque

Se convierte la raíz en un workspace pnpm con Turborepo: un solo `pnpm-workspace.yaml` y
un solo `pnpm-lock.yaml` en la raíz, `front/` donde está, `seed/` en la raíz y
`packages/model/`. `@demo/model` es TS sin compilar (`exports` → `src/index.ts`); `seed`
depende de él con `workspace:*`. Turbo orquesta `dev`, `build` y `typecheck`. La
infraestructura es un `docker-compose.yml` con `mongo:8`, RustFS fijado a un tag y un
contenedor efímero `amazon/aws-cli` que crea el bucket y aplica la política de lectura
anónima. Todo se configura con `${VAR:-default}`, así que funciona sin `.env`.

Lo que depende de RustFS se ha **comprobado en local** (Docker 29 / Compose v5.6.0,
2026-10-24) con `rustfs/rustfs:1.0.3` + `amazon/aws-cli:2.31.0`: `/health` en 9000
responde 200, la imagen trae `curl` (Alpine, usuario 10001), `head-bucket` da 404 sin
bucket y 0 con él, `put-bucket-policy` con `Principal: "*"` y `s3:GetObject` se acepta
(no hay Public Access Block por defecto) y es repetible, GET anónimo → 200, PUT y listado
anónimos → 403. También se ha visto que `docker compose up -d --wait` **no espera** a que
termine un servicio de un solo uso ni falla si este sale con error (ver D1).

## Spec gate decisions

- **D1 — `infra:up` es `docker compose up -d --wait && docker compose wait s3-init`, no solo `up -d --wait`.** [deviates]
  El PRD fija `infra:up` como `docker compose up -d --wait`. Probado en local: `--wait`
  vuelve en cuanto `s3-init` está "running" (el bucket puede no existir aún) y termina en
  0 aunque `s3-init` salga con código 3. Eso rompe la HU 7 (bucket listo nada más
  levantar) y R35 (fallo visible). `docker compose wait s3-init` espera a que termine y
  devuelve su código de salida (probado: 0 → 0, 3 → 3; con el contenedor ya parado
  devuelve su código al momento). Alternativa descartada: hacer que `mongo` dependa de
  `s3-init` con `service_completed_successfully` (mantiene el script del PRD pero ata
  Mongo a S3 sin motivo y retrasa su arranque). Compromiso: el script dice un poco más
  que el PRD; la intención no cambia.
- **D2 — Política anónima solo con `s3:GetObject` sobre `arn:aws:s3:::<bucket>/*`; sin listado anónimo.** [deviates]
  "Solo lectura anónima" podría incluir `s3:ListBucket`. Se deja fuera: la HU 7 solo
  necesita mostrar imágenes por URL, la documentación de RustFS recomienda acotar al
  mínimo, y el CVE-2026-73290 de RustFS afectaba justo al listado anónimo. Compromiso: un
  cliente anónimo no puede listar el bucket (R33).
- **D3 — RustFS fijado a `rustfs/rustfs:1.0.3` (variante musl, no `-glibc`).** [preference]
  Última estable (2026-10-17), posterior al arreglo del CVE-2026-73290 (1.0.0-beta.12) y
  la que se ha probado. Alternativa: `1.0.0` (más antigua, sin probar).
- **D4 — El init usa `amazon/aws-cli:2.31.0`, no `mc`.** [preference]
  Es el cliente que usa la documentación de políticas de RustFS y el que se ha probado; la
  compatibilidad de `mc anonymous` con RustFS no está documentada.
- **D5 — Valores por defecto: `S3_ACCESS_KEY`/`S3_SECRET_KEY` = `rustfsadmin`, `S3_REGION` = `us-east-1`, `S3_ENDPOINT` = `http://localhost:9000`.** [preference]
  Son los defaults de la propia RustFS y la región que pide su documentación. Solo para
  desarrollo local.
- **D6 — Nombres: `docker-compose.yml`; servicios `mongo`, `s3`, `s3-init`; volúmenes `mongo-data`, `s3-data`.** [preference]
- **D7 — `package.json` raíz con `name: "demo-simple-lemony"`, `private: true`, `packageManager: "pnpm@10.19.0"` y `turbo` `^2.11.0` como devDependency.** [open]
  Turbo 2 necesita `packageManager` en la raíz para resolver el workspace; se fija la pnpm
  instalada en local (10.19.0), dentro del supuesto "pnpm 10" del PRD.
- **D8 — En `front/package.json` se añade `"typecheck": "tsc --noEmit"` y se quita el campo `pnpm`.** [open]
  `typecheck` en los tres paquetes (PRD) exige el script en front; `tsc --noEmit` ya pasa
  hoy con el `tsconfig.json` intacto. El campo `pnpm` se ignora en un paquete que no es la
  raíz y su contenido pasa al `pnpm-workspace.yaml` raíz, donde se ponen las dos claves
  (`allowBuilds` y `onlyBuiltDependencies`); pnpm 10.19 acepta ambas (probado).
- **D9 — `typescript` `^6.0.2` como devDependency de `@demo/model` y `@demo/seed`.** [open]
  Con pnpm estricto cada paquete necesita su `tsc`; se usa la misma versión que front.
- **D10 — El lockfile se regenera con `pnpm i` en la raíz, no se migra a mano.** [open]
  Los paquetes críticos de front están fijados a versión exacta en su `package.json`; el
  riesgo de cambio de versiones (PRD) se cubre comprobando dev, build y preview (R10–R12).
- **D11 — `.gitignore` raíz: se añaden `.env` y `.turbo`.** [open]
  La raíz ya ignora `node_modules` (primera línea, sin barra, así que cubre también
  `seed/` y `packages/model/`); se mantiene tal cual.
- **D12 — Tareas de Turbo: `dev` (`cache: false`, `persistent: true`), `build` (`dependsOn: ["^build"]`, `outputs: [".output/**"]`), `typecheck` (`dependsOn: ["^typecheck"]`, sin outputs).** [open]
  `.output/` es la salida de Nitro en front.
- **D13 — La documentación nueva se añade como sección al final del README raíz, en español.** [open]
  El README tiene cambios locales del usuario sin commit; se conservan (R44).

## Ficheros

- `pnpm-workspace.yaml` — creado — `packages: [front, seed, "packages/*"]`, `allowBuilds` (esbuild, lightningcss: true) y `onlyBuiltDependencies` (esbuild, lightningcss). (R1, R3)
- `pnpm-lock.yaml` — creado (generado por `pnpm i`). (R2)
- `package-lock.json` — eliminado. (R2)
- `front/pnpm-workspace.yaml`, `front/pnpm-lock.yaml` — eliminados. (R2)
- `package.json` — modificado — ver D7; scripts `dev`/`build`/`typecheck` = `turbo run <t>`, `infra:up`, `infra:down` = `docker compose down`. (R4, R20, R30, R37, R38)
- `turbo.json` — creado — `$schema` + las tres tareas de D12. (R19)
- `tsconfig.base.json` — creado — `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict`, `noEmit`, `skipLibCheck`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`. (R18)
- `front/package.json` — modificado — solo lo de D8. (R3, R8)
- `front/tsconfig.json` — **no se toca**. (R7)
- `packages/model/package.json`, `packages/model/tsconfig.json`, `packages/model/src/index.ts` (`export {}`) — creados. (R13, R14)
- `seed/package.json`, `seed/tsconfig.json`, `seed/src/index.ts` (`export {}`) — creados. (R15, R17)
- `docker-compose.yml` — creado — ver abajo. (R25–R29, R41, R42)
- `.env.example` — creado. (R39)
- `.gitignore` — modificado — D11, sin tocar el bloque `# BEGIN lemony … # END lemony`. (R40)
- `README.md` — modificado — sección nueva de arranque. (R43, R44)

## Interfaces

### Scripts de la raíz

| Script       | Comando                                                 |
| ------------ | ------------------------------------------------------- |
| `dev`        | `turbo run dev`                                         |
| `build`      | `turbo run build`                                       |
| `typecheck`  | `turbo run typecheck`                                   |
| `infra:up`   | `docker compose up -d --wait && docker compose wait s3-init` |
| `infra:down` | `docker compose down`                                   |

### `docker-compose.yml` (forma)

- `mongo`: `image: mongo:8`, `ports: ["27017:27017"]`, volumen `mongo-data:/data/db`,
  healthcheck `["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]`
  (intervalo ~5s, `retries` finitos, `start_period` ~10s). Sin variables de auth.
- `s3`: `image: rustfs/rustfs:1.0.3`, `ports: ["9000:9000", "9001:9001"]`, volumen
  `s3-data:/data`, entorno `RUSTFS_ACCESS_KEY: ${S3_ACCESS_KEY:-rustfsadmin}`,
  `RUSTFS_SECRET_KEY: ${S3_SECRET_KEY:-rustfsadmin}`, `RUSTFS_CONSOLE_ENABLE: "true"`;
  healthcheck `["CMD", "curl", "-fsS", "http://127.0.0.1:9000/health"]` con `retries`
  finitos.
- `s3-init`: `image: amazon/aws-cli:2.31.0`, `depends_on: { s3: { condition: service_healthy } }`,
  `restart: "no"`, entorno `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_DEFAULT_REGION`
  desde `S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_REGION` y `BUCKET: ${S3_BUCKET:-images}`;
  `entrypoint: ["/bin/sh", "-ec"]` con un script que:
  1. `aws --endpoint-url http://s3:9000 s3api head-bucket --bucket "$BUCKET"` o, si falla,
     `create-bucket`;
  2. escribe la política (Version 2012-10-17, `Effect: Allow`, `Principal: "*"`,
     `Action: ["s3:GetObject"]`, `Resource: ["arn:aws:s3:::$BUCKET/*"]`) en un fichero
     temporal del contenedor y llama a `put-bucket-policy`;
  3. imprime `bucket <nombre> ready`.
  Con `-e` cualquier fallo sale con código distinto de 0. En YAML los `$` del script van
  como `$$` para que compose no los interpole.
- `volumes: { mongo-data: {}, s3-data: {} }`.

### `.env.example`

```
MONGODB_URI=mongodb://localhost:27017/demo
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=images
S3_REGION=us-east-1
```

`MONGODB_URI` y `S3_ENDPOINT` son para las apps (siguiente fase); compose no las usa.

## Casos límite

- **Raíz instalada con npm**: hay un `node_modules` de npm en la raíz. Borrarlo y ejecutar
  `pnpm i` **en el mismo comando** (si no, `lemony` falta entre medias y los hooks del
  harness fallan; y pnpm sin TTY puede abortar al encontrar un `node_modules` de otro
  gestor). Borrar también `front/node_modules`. (R5, R6)
- **Avisos de builds bloqueados** tras `pnpm i` → revisar que `allowBuilds`/`onlyBuiltDependencies`
  están en el workspace raíz; ningún otro paquete se añade a la lista sin una discovery. (R3)
- **Cambio de versiones al regenerar el lockfile** → si front deja de compilar o arrancar,
  es una discovery (T1), no se fijan versiones nuevas por cuenta propia. (R10–R12)
- **`infra:up` repetido**: compose deja `mongo`/`s3` como están y vuelve a lanzar `s3-init`;
  `head-bucket` evita crear de nuevo y `put-bucket-policy` es repetible. (R34)
- **`s3-init` falla** (credenciales mal en `.env`, política rechazada) → `docker compose wait`
  devuelve su código y `infra:up` falla; el log se ve con `docker compose logs s3-init`. (R35)
- **`s3` o `mongo` nunca sanos** (puerto ocupado, imagen rota) → `up --wait` falla gracias a
  los `retries` finitos de los healthchecks. (R36)
- **Sin `.env`** → defaults; **con `.env`** compose lo lee solo de la raíz. (R41, R42)
- **Cambiar `S3_ACCESS_KEY`/`S3_SECRET_KEY` con un volumen `s3-data` ya creado**: RustFS
  toma las credenciales del entorno; documentarlo no es necesario en esta fase.
- **Objeto inexistente con GET anónimo** → 404 (no 403), comprobado; no es un error.

## Pruebas

No hay lógica de negocio: no se añaden tests unitarios ni framework de tests (fuera de
alcance en el PRD). La verificación es de humo, con comandos que el Implementer y el
Reviewer ejecutan:

1. Workspace: `pnpm i` (código 0, un solo lockfile), `ls -l seed/node_modules/@demo/model`
   (enlace), `node_modules/.bin/lemony --version`.
2. Turbo: `pnpm typecheck` (tres paquetes, 0); error de tipos temporal en `seed` → falla y
   se revierte; `pnpm build` (0); `pnpm dev` + `curl -o /dev/null -w '%{http_code}' localhost:3000`
   → 200; `pnpm --filter front preview` arranca.
3. Infra: `pnpm infra:up` (0) y `docker compose ps -a`; `docker compose exec mongo mongosh --quiet --eval "db.adminCommand('ping').ok"`
   → 1; subir un objeto con `docker run --rm --network <proyecto>_default amazon/aws-cli:2.31.0 …`
   (o aws-cli local) y `curl` anónimo → 200; `curl -X PUT` y `curl` del bucket → 403;
   `pnpm infra:up` otra vez → 0 y el objeto sigue; `pnpm infra:down` → volúmenes siguen
   en `docker volume ls`; `infra:up` → objeto sigue legible.
4. Fallo de init: `S3_BUCKET=Nombre_Invalido pnpm infra:up` (nombre de bucket no válido
   en S3, así que `create-bucket` falla) → código distinto de 0; después `pnpm infra:up`
   sin la variable vuelve a 0 (R35). Opcional para R42: `S3_BUCKET=otro pnpm infra:up`
   crea `otro`.

No se prueban: el contenido de `@demo/model` (vacío) ni Mongo con auth (fuera de alcance).
