# Lemony

## Crear proyecto

Importante haber creado el proyecto en Github !!

Para este proyecto vamos arrancar primero por crear el proyecto de Front (podríamos haberlo hecho tirando de lemony pero no merece la pena gastar tokens).

```bash
pnpx @tanstack/cli@latest create front
```

Le pedimos que instale shadcn.

## Setup Lemony

Vamos a instalar lemony en el raiz del proyecto, lo podemos encontrar aquí

https://www.npmjs.com/package/@lemoncode/lemony

Y para instalarlo

--> add the harness to the project

```bash
npm i -D @lemoncode/lemony
```

--> scaffold the harness into this repo

```bash
npx lemony install
```

## Setup skills TanStack Start

Ahora vamos a instalar el skill de Tan Stack Start para tener la estructura de pods lista

```bash
npx @content-island/ai-skills
```

Sólo el de tanstack Start

## Paso 1 - Crear mono repo

Ahora vamos a darle la estructura de mono repo aprovechamos el prompt del otro ejemplo que vamos a encontrarnos aquí... muuuchas más preguntas :)

> IMPORTANTE el `/define` si te fijas estos comandos tienen el emoji del limon para saber que son de lemony

```bash
/define Debajo de la carpeta Front tengo un proyecto creado con TanStackstart, ahora me hace falta pasar esto a monorepo ya que quiero crear una carpeta hermana de paquetes y dentro va a tener un modelo común de base de datos (ojo no hay que modelar nada en este fase, sólo crear el proyecto), y después otro hermano que se llamará seed que será el código para generar la semilla de datos para la base de datos en desarrollo (lo mismo no hay que crear nada de semilla hora lo haremos después), y ese proyecto seed tendrá dependencia con el proyecto de modelo.

Además me va hacer falta tirar de docker compose y levantar por un lado una BBDD mongoDB y por otro lado un emular de S3 en local para poder subir imagenes
```

Una vez resuelto esto genera un plan, y lo publica como issue en github, por ejemplo

## Arranque en local (monorepo + infraestructura)

El repositorio es un monorepo pnpm + Turborepo:

- `front/` — la app TanStack Start.
- `packages/model/` (`@demo/model`) — modelo común de base de datos (vacío de momento).
- `seed/` (`@demo/seed`) — semilla de datos para desarrollo (vacía de momento); depende de `@demo/model`.

Necesitas Node, pnpm 10 y Docker con Compose.

### Arranque de cero

```bash
pnpm i          # instala todo el workspace desde la raíz
pnpm infra:up   # levanta MongoDB y el S3 local (RustFS) y crea el bucket
pnpm dev        # arranca front en http://localhost:3000
```

`pnpm infra:up` solo termina bien cuando Mongo y S3 están sanos y el bucket está creado
con su política de lectura anónima. Si algo falla, mira `docker compose logs s3-init`.

Otros comandos desde la raíz:

- `pnpm build` — compila front.
- `pnpm typecheck` — comprueba tipos en los tres paquetes.
- `pnpm infra:down` — para y elimina los contenedores **conservando los datos** (volúmenes).

### Puertos

| Puerto | Servicio                        |
| ------ | ------------------------------- |
| 3000   | front (`pnpm dev`)              |
| 27017  | MongoDB (sin autenticación)     |
| 9000   | API S3 de RustFS                |
| 9001   | Consola web de RustFS           |

### Consola de RustFS

- URL: http://localhost:9001/rustfs/console/
- Usuario / contraseña por defecto: `rustfsadmin` / `rustfsadmin`

El bucket por defecto es `images`. Los objetos se pueden leer sin credenciales en
`http://localhost:9000/images/<clave>`; subir, borrar o listar requiere credenciales.

### Configuración (`.env`)

Todo funciona sin `.env`: `docker-compose.yml` trae valores por defecto. Para cambiarlos,
copia el ejemplo y edítalo (el `.env` está en `.gitignore`):

```bash
cp .env.example .env
```

Variables: `MONGODB_URI`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
y `S3_REGION`.

### Imágenes de la Villa (`pnpm seed:images`)

Con `pnpm infra:up` hecho, `pnpm seed:images` sube al bucket las 10 imágenes de la Villa
(lee el `.env` de la raíz si existe; si no, usa los valores por defecto).

Las imágenes salen de `seed/assets/images/` y la lista (clave + texto alternativo) es el
manifiesto `packages/model/src/images/villa-images.json`. El script solo sube y
sobrescribe esas claves: **nunca borra** ni toca otros objetos del bucket.

Quien muestre las imágenes monta la URL con `S3_PUBLIC_URL`
(`http://localhost:9000/images` en `.env.example`) y `buildImageUrl` de `@demo/model`.

### Aviso: borrar los datos

`docker compose down -v` **borra los volúmenes de MongoDB y de S3 de forma irreversible**
(base de datos, bucket e imágenes). Ningún script del proyecto lo hace; usa
`pnpm infra:down` para parar sin perder datos.
