import { clamp } from "./math";
import type { MoodId } from "./moods";

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type PaletteColor = RgbColor & {
  hex: string;
  weight: number;
  hue: number;
  saturation: number;
  lightness: number;
};

export type MoodProfile = {
  id: MoodId;
  tags: string[];
  searchQueries: string[];
  lightness: number;
  saturation: number;
  warmth: number;
  contrast: number;
  energy: number;
};

type PixelData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

type ColorBucket = {
  count: number;
  red: number;
  green: number;
  blue: number;
};

function rgbToHsl({ r, g, b }: RgbColor) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (max === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: Number.isFinite(saturation) ? saturation : 0,
    lightness,
  };
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0").toUpperCase();
}

function colorDistance(first: RgbColor, second: RgbColor) {
  return Math.sqrt(
    (first.r - second.r) ** 2 +
    (first.g - second.g) ** 2 +
    (first.b - second.b) ** 2,
  );
}

function bucketToColor(bucket: ColorBucket, total: number): PaletteColor {
  const color = {
    r: Math.round(bucket.red / bucket.count),
    g: Math.round(bucket.green / bucket.count),
    b: Math.round(bucket.blue / bucket.count),
  };
  const hsl = rgbToHsl(color);
  return {
    ...color,
    hex: `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`,
    weight: bucket.count / total,
    ...hsl,
  };
}

export function extractPalette(image: PixelData, limit = 5): PaletteColor[] {
  if (image.width <= 0 || image.height <= 0 || image.data.length < 4 || limit <= 0) {
    return [];
  }

  const buckets = new Map<number, ColorBucket>();
  const pixelCount = Math.floor(image.data.length / 4);
  const stride = Math.max(1, Math.floor(pixelCount / 50_000));
  let sampledPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += stride) {
    const index = pixel * 4;
    if (image.data[index + 3] < 128) continue;

    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += r;
    bucket.green += g;
    bucket.blue += b;
    buckets.set(key, bucket);
    sampledPixels += 1;
  }

  if (sampledPixels === 0) return [];

  const candidates = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((bucket) => bucketToColor(bucket, sampledPixels));
  const selected: PaletteColor[] = [];

  for (const candidate of candidates) {
    if (selected.every((color) => colorDistance(color, candidate) >= 42)) {
      selected.push(candidate);
    }
    if (selected.length === limit) break;
  }

  if (selected.length < limit) {
    for (const candidate of candidates) {
      if (!selected.includes(candidate) &&
        selected.every((color) => colorDistance(color, candidate) >= 20)) {
        selected.push(candidate);
      }
      if (selected.length === limit) break;
    }
  }

  const selectedWeight = selected.reduce((sum, color) => sum + color.weight, 0);
  return selected.map((color) => ({
    ...color,
    weight: selectedWeight > 0 ? color.weight / selectedWeight : 0,
  }));
}

function relativeLuminance(color: RgbColor) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function deriveMood(palette: PaletteColor[]): MoodProfile {
  if (palette.length === 0) {
    return {
      id: "open-prescription",
      tags: ["NEUTRAL", "STEADY", "FOCUSED"],
      searchQueries: ["focused instrumental mix", "minimal ambient work playlist"],
      lightness: 0.5,
      saturation: 0,
      warmth: 0,
      contrast: 0,
      energy: 0.35,
    };
  }

  const totalWeight = palette.reduce((sum, color) => sum + color.weight, 0) || 1;
  const weighted = (value: (color: PaletteColor) => number) =>
    palette.reduce((sum, color) => sum + value(color) * color.weight, 0) / totalWeight;
  const lightness = weighted((color) => color.lightness);
  const saturation = weighted((color) => color.saturation);
  const warmth = weighted((color) =>
    color.saturation * Math.cos((color.hue - 45) * Math.PI / 180));
  const averageLuminance = weighted(relativeLuminance);
  const contrast = Math.sqrt(weighted((color) =>
    (relativeLuminance(color) - averageLuminance) ** 2));
  const energy = clamp(saturation * 0.55 + contrast * 1.65 + (1 - Math.abs(lightness - 0.55)) * 0.15);

  const lightTag = lightness < 0.34 ? "LOW LIGHT" : lightness > 0.72 ? "LUMINOUS" : "BALANCED";
  const temperatureTag = warmth > 0.12 ? "WARM" : warmth < -0.12 ? "COOL" : "NEUTRAL";
  const energyTag = energy > 0.62 ? "ENERGETIC" : energy < 0.34 ? "QUIET" : "STEADY";
  const colorTag = saturation > 0.58 ? "VIVID" : saturation < 0.2 ? "MUTED" : "SOFT COLOR";

  let id: MoodId = "clear-focus";
  let genre = "minimal electronic focus";
  if (lightness < 0.34 && energy < 0.52) {
    id = "midnight-focus";
    genre = "late night ambient slowcore";
  } else if (lightness < 0.42 && energy >= 0.52) {
    id = "dark-current";
    genre = "dark electronic trip hop";
  } else if (warmth > 0.15 && energy < 0.55) {
    id = "golden-pause";
    genre = "warm vinyl jazz bossa nova";
  } else if (warmth > 0.12 && energy >= 0.55) {
    id = "sunlit-motion";
    genre = "upbeat indie pop morning";
  } else if (warmth < -0.12 && energy < 0.52) {
    id = "blue-hour";
    genre = "dream pop ambient nocturnal";
  } else if (energy > 0.64) {
    id = "color-rush";
    genre = "energetic indie funk playlist";
  }

  const pace = energy > 0.62 ? "high energy" : energy < 0.34 ? "calm" : "steady";
  return {
    id,
    tags: [lightTag, temperatureTag, energyTag, colorTag],
    searchQueries: [
      `${genre} playlist`,
      `${pace} instrumental work mix`,
      `${temperatureTag.toLowerCase()} ${colorTag.toLowerCase()} mood music`,
    ],
    lightness,
    saturation,
    warmth,
    contrast,
    energy,
  };
}

export function youtubeMusicSearchUrl(query: string) {
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}
