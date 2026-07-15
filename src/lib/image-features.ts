/** Lightweight client-side visual features for local safety photo scoring. */

export interface ImageFeatures {
  brightness: number;
  contrast: number;
  orangeRatio: number;
  yellowRatio: number;
  grayRatio: number;
  brownRatio: number;
  darkRatio: number;
  blueSkyRatio: number;
  edgeDensity: number;
  warmRatio: number;
}

const EMPTY: ImageFeatures = {
  brightness: 0.5,
  contrast: 0.3,
  orangeRatio: 0,
  yellowRatio: 0,
  grayRatio: 0.2,
  brownRatio: 0.1,
  darkRatio: 0.1,
  blueSkyRatio: 0,
  edgeDensity: 0.2,
  warmRatio: 0.2,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

/**
 * Sample a downscaled canvas and estimate color / structure features.
 * Works for data URLs and CORS-enabled public URLs.
 */
export async function extractImageFeatures(src: string): Promise<ImageFeatures> {
  if (!src || src.startsWith('data:image/jpeg;base64,xx')) return { ...EMPTY };

  try {
    const img = await loadImage(src);
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { ...EMPTY };
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let sum = 0;
    let sumSq = 0;
    let orange = 0;
    let yellow = 0;
    let gray = 0;
    let brown = 0;
    let dark = 0;
    let blue = 0;
    let warm = 0;
    let edge = 0;
    const n = size * size;
    const luminances = new Float32Array(n);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      luminances[p] = lum;
      sum += lum;
      sumSq += lum * lum;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      if (lum < 0.18) dark++;
      if (sat < 0.15 && lum > 0.25 && lum < 0.75) gray++;
      if (r > 140 && g > 60 && g < 160 && b < 90 && r > g && g > b) orange++;
      if (r > 160 && g > 140 && b < 100 && Math.abs(r - g) < 50) yellow++;
      if (r > 80 && g > 50 && b < 70 && r >= g && g > b && lum < 0.55) brown++;
      if (b > r + 20 && b > g + 10 && lum > 0.35) blue++;
      if (r > g && r > b) warm++;
    }

    for (let y = 0; y < size; y++) {
      for (let x = 1; x < size; x++) {
        const a = luminances[y * size + x];
        const prev = luminances[y * size + x - 1];
        if (Math.abs(a - prev) > 0.12) edge++;
      }
    }

    const brightness = sum / n;
    const variance = sumSq / n - brightness * brightness;
    const contrast = Math.sqrt(Math.max(variance, 0));

    return {
      brightness,
      contrast,
      orangeRatio: orange / n,
      yellowRatio: yellow / n,
      grayRatio: gray / n,
      brownRatio: brown / n,
      darkRatio: dark / n,
      blueSkyRatio: blue / n,
      edgeDensity: edge / (n - size),
      warmRatio: warm / n,
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function extractPhotosFeatures(urls: string[]): Promise<ImageFeatures> {
  if (urls.length === 0) return { ...EMPTY };
  const feats = await Promise.all(urls.map((u) => extractImageFeatures(u)));
  const keys = Object.keys(EMPTY) as (keyof ImageFeatures)[];
  const avg = { ...EMPTY };
  for (const k of keys) {
    avg[k] = feats.reduce((s, f) => s + f[k], 0) / feats.length;
  }
  return avg;
}

/** Map a catalog visual cue to a 0–1 match score from image features. */
export function cueMatchScore(cue: string, f: ImageFeatures): number {
  switch (cue) {
    case 'trench':
    case 'dirt':
      return clamp01(f.brownRatio * 4 + f.darkRatio * 2);
    case 'dark-void':
    case 'opening':
    case 'underground':
    case 'round-opening':
      return clamp01(f.darkRatio * 5 + (1 - f.brightness) * 0.4);
    case 'asphalt':
    case 'road':
      return clamp01(f.grayRatio * 3 + Math.max(0, 0.35 - f.orangeRatio));
    case 'barrier':
    case 'metal-structure':
    case 'edge-dense':
      return clamp01(f.edgeDensity * 3 + f.grayRatio * 1.5);
    case 'cable':
    case 'pipe':
    case 'electrical':
      return clamp01(f.edgeDensity * 2.5 + f.grayRatio * 1.2);
    case 'orange-ppe':
    case 'yellow-mark':
      return clamp01(f.orangeRatio * 8 + f.yellowRatio * 6);
    case 'missing-ppe':
      return clamp01(Math.max(0, 0.5 - f.orangeRatio * 5));
    case 'person':
      return clamp01(0.3 + f.warmRatio * 0.6);
    case 'height':
    case 'sky':
      return clamp01(f.blueSkyRatio * 4 + f.brightness * 0.25);
    case 'low-light':
      return clamp01((1 - f.brightness) * 1.2);
    case 'clutter':
    case 'debris':
      return clamp01(f.edgeDensity * 2 + f.contrast * 1.5);
    default:
      return 0.12;
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
