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

