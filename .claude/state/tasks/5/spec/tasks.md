# Tareas — Imágenes de la Villa en el S3 local y manifiesto

## Group 1 — Manifiesto en `@demo/model` y ejecución de TS sin compilar _(riesgo aislado: nueva costura model→seed con JSON y type stripping nativo, el riesgo que señala el PRD; se cierra con `pnpm seed:images` ejecutándose y leyendo el manifiesto, sin tocar el S3)_

- [ ] **T1 — Tracer: `pnpm seed:images` ejecuta TS de seed que importa el manifiesto de model.**
      Opciones de D2 en `tsconfig.base.json`; `villa-images.json` con las 10 entradas
      (`key` + `alt` copiados de `villa.json`); `villa-images.ts` con `VillaImage` y
      `villaImages`; re-exports en `packages/model/src/index.ts`; `@types/node` y
      `types: ["node"]` en seed; `seed/src/upload-images.ts` mínimo que importa
      `villaImages` y muestra cuántas hay; scripts `images` (seed) y `seed:images` (raíz).
      `pnpm seed:images` → 0 y `pnpm typecheck` → 0
      (R1, R2, R3, R4, R5, R6, R13, R14, R29)
- [ ] T2 — `buildImageUrl(baseUrl, key)` exportada desde model, que quita las barras finales de la base, y `S3_PUBLIC_URL` en `.env.example` (R7, R8, R9)

## Group 2 — Assets y validación previa _(sin red: copia los binarios y falla antes de subir; se cierra con el script detectando ficheros que faltan)_

- [ ] T3 — Copiar los 10 ficheros de imagen y `CREDITOS.md` del handoff a `seed/assets/images/` (copia binaria, `shasum` igual) (R10, R11)
- [ ] T4 — Validación previa en el script: ficheros que faltan, keys no planas y extensiones no admitidas; nombra todos los problemas y termina con código 1 sin crear el cliente S3 (R23, R24, R25, R27)

## Group 3 — Subida al S3 _(escribe en el bucket sobrescribiendo objetos y maneja credenciales; se cierra con las 10 imágenes servidas por GET anónimo)_ [risk: data-loss, secrets]

- [ ] T5 — `@aws-sdk/client-s3` `3.1156.0`; configuración con valores por defecto (variable vacía = no definida) y cliente path-style; PUT en serie de cada entrada con su `Content-Type`, una línea por key y resumen final sin credenciales; nunca borra ni lista (R12, R15, R16, R17, R18, R19, R20, R21, R28)
- [ ] T6 — Fallo de subida: para en la primera key que falla, mensaje con la key y una causa nunca vacía (incluido el `AggregateError` del S3 caído), código distinto de 0 y sin resumen (R26, R27)
- [ ] T7 — Relanzar con el bucket poblado termina en 0 y deja intactos los objetos ajenos al manifiesto; `.env` de la raíz se respeta (R14, R19, R20, R22)

## Group 4 — Documentación y comprobaciones finales _(trivial: README y gates; se cierra con la prueba de humo completa del diseño)_

- [ ] T8 — Subsección de `pnpm seed:images` en el README (uso, `S3_PUBLIC_URL`, origen de las imágenes, nunca borra) sin perder el contenido previo; `pnpm typecheck` y `pnpm build` en verde (R9, R29, R30)
