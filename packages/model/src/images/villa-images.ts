import data from './villa-images.json' with { type: 'json' };

export interface VillaImage {
  readonly key: string;
  readonly alt: string;
}

export const villaImages: readonly VillaImage[] = data;

export function buildImageUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${key}`;
}
