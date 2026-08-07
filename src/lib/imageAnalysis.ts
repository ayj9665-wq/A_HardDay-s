import { deriveMood, extractPalette, type MoodProfile, type PaletteColor } from "../domain/medicine";

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
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ANALYSIS_WIDTH = 560;
const ANALYSIS_HEIGHT = 310;

export async function prepareImageLayer(file: File, index = 0): Promise<ImageLayer> {
  if (!file.type.startsWith("image/")) {
    throw new Error("DROP PNG, JPG, WEBP, OR GIF IMAGES.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("EACH IMAGE MUST BE SMALLER THAN 20 MB.");
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(previewUrl);
    const offset = (index % 5) * 4;
    const aspect = image.naturalWidth / image.naturalHeight;
    const initialWidth = aspect < 0.8 ? 35 : aspect > 1.8 ? 62 : 48;
    return {
      id: crypto.randomUUID(),
      previewUrl,
      fileName: file.name || "clipboard-image",
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      x: 42 + offset,
      y: 42 + offset,
      width: initialWidth,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export async function analyzeImageLayers(layers: ImageLayer[]): Promise<CompositeAnalysis> {
  if (layers.length === 0) {
    return { palette: [], mood: deriveMood([]) };
  }

  const images = await Promise.all(layers.map((layer) => loadImage(layer.previewUrl)));
  const canvas = document.createElement("canvas");
  canvas.width = ANALYSIS_WIDTH;
  canvas.height = ANALYSIS_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("COLOR ANALYSIS IS NOT AVAILABLE.");

  layers.forEach((layer, index) => {
    const width = layer.width / 100 * ANALYSIS_WIDTH;
    const height = width * layer.naturalHeight / layer.naturalWidth;
    const left = layer.x / 100 * ANALYSIS_WIDTH - width / 2;
    const top = layer.y / 100 * ANALYSIS_HEIGHT - height / 2;
    context.drawImage(images[index], left, top, width, height);
  });

  const palette = extractPalette(context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT));
  if (palette.length === 0) throw new Error("NO VISIBLE COLORS FOUND.");
  return { palette, mood: deriveMood(palette) };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("AN IMAGE COULD NOT BE READ."));
    image.src = source;
  });
}
