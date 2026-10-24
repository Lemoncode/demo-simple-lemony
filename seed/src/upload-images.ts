import { access, readFile } from 'node:fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { villaImages, type VillaImage } from '@demo/model';

const assetsDir = new URL('../assets/images/', import.meta.url);

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function contentTypeFor(key: string): string | undefined {
  const dot = key.lastIndexOf('.');
  return dot === -1 ? undefined : contentTypes[key.slice(dot).toLowerCase()];
}

function isPlainFileName(key: string): boolean {
  return !key.includes('/') && !key.includes('\\') && key !== '.' && key !== '..';
}

async function findProblems(images: readonly VillaImage[]): Promise<string[]> {
  const problems: string[] = [];
  for (const { key } of images) {
    if (!isPlainFileName(key)) {
      problems.push(`La key "${key}" no es un nombre de fichero plano`);
      continue;
    }
    if (contentTypeFor(key) === undefined) {
      problems.push(`La key "${key}" no acaba en .jpg, .jpeg o .png`);
    }
    try {
      await access(new URL(key, assetsDir));
    } catch {
      problems.push(`Falta el fichero seed/assets/images/${key}`);
    }
  }
  return problems;
}

// Why: an empty variable (S3_BUCKET=) counts as unset, like compose's ${VAR:-default} (D9).
function readConfig() {
  const env = process.env;
  return {
    endpoint: env.S3_ENDPOINT || 'http://localhost:9000',
    accessKeyId: env.S3_ACCESS_KEY || 'rustfsadmin',
    secretAccessKey: env.S3_SECRET_KEY || 'rustfsadmin',
    bucket: env.S3_BUCKET || 'images',
    region: env.S3_REGION || 'us-east-1',
  };
}

const problems = await findProblems(villaImages);
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error('No se ha subido ninguna imagen.');
  process.exit(1);
}

const config = readConfig();
const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: true,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
});

// Why: with S3 down the SDK throws an AggregateError whose message is empty, so the
// cause is assembled from name, S3 code, HTTP status, message and the inner errors' codes.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error) || 'error desconocido';
  const details = error as Error & { Code?: string; $metadata?: { httpStatusCode?: number } };
  const parts: string[] = [error.name];
  if (details.Code && details.Code !== error.name) parts.push(details.Code);
  if (details.$metadata?.httpStatusCode) parts.push(`HTTP ${details.$metadata.httpStatusCode}`);
  if (error.message) parts.push(error.message);
  if (error instanceof AggregateError) {
    const codes = error.errors
      .map((inner: unknown) => (inner as { code?: string } | null)?.code)
      .filter((code): code is string => Boolean(code));
    if (codes.length > 0) parts.push([...new Set(codes)].join(', '));
  }
  return parts.filter(Boolean).join(': ') || 'error desconocido';
}

// Only PutObject: the script never lists, deletes or touches keys outside the manifest (R20).
async function uploadAll(): Promise<boolean> {
  for (const { key } of villaImages) {
    try {
      const body = await readFile(new URL(key, assetsDir));
      await client.send(
        new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentTypeFor(key) }),
      );
    } catch (error) {
      console.error(`No se pudo subir ${key}: ${describeError(error)}`);
      return false;
    }
    console.log(`subida ${key}`);
  }
  return true;
}

if (await uploadAll()) {
  console.log(`${villaImages.length} imágenes subidas al bucket ${config.bucket} (${config.endpoint})`);
} else {
  process.exitCode = 1;
}
