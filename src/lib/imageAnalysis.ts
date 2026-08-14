import { AppError } from "../core/errors";
import { IMAGE_POLICY, isAllowedImageType, isWithinImageSize } from "../core/imagePolicy";
import type { RecommendationTrack } from "../data/trackCatalog";
import { deriveMood, extractPalette, type MoodProfile, type PaletteColor } from "../domain/medicine";
import { recommendTracks } from "../domain/trackRecommendations";

export type ImageLayer = {
  id: string;
  previewUrl: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  width: number;
};

export type CompositeAnalysis = {
  palette: PaletteColor[];
  mood: MoodProfile;
  recommendedTracks: RecommendationTrack[];
};

export type LayerPlacement = {
  x: number;
  y: number;
};

const ANALYSIS_WIDTH = 560;
const ANALYSIS_HEIGHT = 310;

export async function prepareImageLayer(
  file: File,
  index = 0,
  placement?: LayerPlacement,
): Promise<ImageLayer> {
  if (!isAllowedImageType(file.type)) {
    throw new AppError("IMAGE_UNSUPPORTED_TYPE");
  }
  if (!isWithinImageSize(file.size)) {
    throw new AppError("IMAGE_TOO_LARGE", { limitBytes: IMAGE_POLICY.maxBytes });
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(previewUrl);
    const offset = (index % 5) * 3;
    const aspect = image.naturalWidth / image.naturalHeight;
    const initialWidth = aspect < 0.8 ? 35 : aspect > 1.8 ? 62 : 48;
    return {
      id: crypto.randomUUID(),
      previewUrl,
      fileName: file.name || "clipboard-image",
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      x: placement ? Math.min(115, Math.max(-15, placement.x + offset)) : 42 + offset,
      y: placement ? Math.min(115, Math.max(-15, placement.y + offset)) : 42 + offset,
      width: initialWidth,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export async function analyzeImageLayers(layers: ImageLayer[]): Promise<CompositeAnalysis> {
  if (layers.length === 0) {
    const mood = deriveMood([]);
    return { palette: [], mood, recommendedTracks: recommendTracks(mood, []) };
  }

  const images = await Promise.all(layers.map((layer) => loadImage(layer.previewUrl)));
  const canvas = document.createElement("canvas");
  canvas.width = ANALYSIS_WIDTH;
  canvas.height = ANALYSIS_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new AppError("ANALYSIS_UNAVAILABLE");

  layers.forEach((layer, index) => {
    const width = layer.width / 100 * ANALYSIS_WIDTH;
    const height = width * layer.naturalHeight / layer.naturalWidth;
    const left = layer.x / 100 * ANALYSIS_WIDTH - width / 2;
    const top = layer.y / 100 * ANALYSIS_HEIGHT - height / 2;
    context.drawImage(images[index], left, top, width, height);
  });

  const palette = extractPalette(context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT));
  if (palette.length === 0) throw new AppError("ANALYSIS_NO_COLORS");
  const mood = deriveMood(palette);
  return { palette, mood, recommendedTracks: recommendTracks(mood, palette) };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new AppError("IMAGE_UNREADABLE"));
    image.src = source;
  });
}
