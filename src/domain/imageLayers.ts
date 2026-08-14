import { AppError } from "../core/errors";
import { IMAGE_POLICY, isAllowedImageType, remainingImageSlots } from "../core/imagePolicy";
import { clamp } from "../core/math";

/** A placed image on the medicine stage. Positions are percentages of the stage. */
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

export type LayerPlacement = {
  x: number;
  y: number;
};

/** Layers may hang off the stage, but never so far that they cannot be grabbed back. */
export const LAYER_BOUNDS = {
  minPosition: -20,
  maxPosition: 120,
  minWidth: 12,
  maxWidth: 160,
} as const;

export type PointerAction = {
  id: string;
  pointerId: number;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
};

export type LayerGeometry = Partial<Pick<ImageLayer, "x" | "y" | "width">>;

export type StageBounds = {
  width: number;
  height: number;
};

/** Translates a pointer drag into the layer's new geometry. */
export function pointerGeometry(
  action: PointerAction,
  clientX: number,
  clientY: number,
  bounds: StageBounds,
): LayerGeometry {
  if (bounds.width <= 0 || bounds.height <= 0) return {};

  const acrossPercent = ((clientX - action.startClientX) / bounds.width) * 100;

  if (action.mode === "resize") {
    return {
      width: clamp(
        action.startWidth + acrossPercent,
        LAYER_BOUNDS.minWidth,
        LAYER_BOUNDS.maxWidth,
      ),
    };
  }

  const downPercent = ((clientY - action.startClientY) / bounds.height) * 100;
  return {
    x: clamp(
      action.startX + acrossPercent,
      LAYER_BOUNDS.minPosition,
      LAYER_BOUNDS.maxPosition,
    ),
    y: clamp(
      action.startY + downPercent,
      LAYER_BOUNDS.minPosition,
      LAYER_BOUNDS.maxPosition,
    ),
  };
}

/** Arrow keys nudge; Shift nudges further. Returns null for other keys. */
export function keyboardGeometry(
  layer: ImageLayer,
  key: string,
  fine = true,
): LayerGeometry | null {
  const step = fine ? 1 : 5;
  switch (key) {
    case "ArrowLeft":
      return { x: layer.x - step };
    case "ArrowRight":
      return { x: layer.x + step };
    case "ArrowUp":
      return { y: layer.y - step };
    case "ArrowDown":
      return { y: layer.y + step };
    default:
      return null;
  }
}

export function updateLayer(
  layers: ImageLayer[],
  id: string,
  geometry: LayerGeometry,
): ImageLayer[] {
  return layers.map((layer) => (layer.id === id ? { ...layer, ...geometry } : layer));
}

/** Stage order is paint order, so "front" means last. */
export function bringToFront(layers: ImageLayer[], id: string): ImageLayer[] {
  const target = layers.find((layer) => layer.id === id);
  return target ? [...layers.filter((layer) => layer.id !== id), target] : layers;
}

export function withoutLayer(layers: ImageLayer[], id: string): ImageLayer[] {
  return layers.filter((layer) => layer.id !== id);
}

/** After a removal the topmost remaining layer takes the selection. */
export function selectionAfterRemoval(layers: ImageLayer[], removedId: string): string | null {
  return withoutLayer(layers, removedId).at(-1)?.id ?? null;
}

export type FileSelection = {
  accepted: File[];
  /** Set when nothing can be accepted at all. */
  rejection: AppError | null;
  /** Set when some files were accepted but others did not fit. */
  truncated: boolean;
};

/** Decides which dropped or picked files may join the stage, and why not. */
export function selectFilesToAdd(currentCount: number, files: File[]): FileSelection {
  const images = files.filter((file) => isAllowedImageType(file.type));
  const available = remainingImageSlots(currentCount);

  if (images.length === 0) {
    return { accepted: [], rejection: new AppError("IMAGE_UNSUPPORTED_TYPE"), truncated: false };
  }
  if (available === 0) {
    return {
      accepted: [],
      rejection: new AppError("IMAGE_LIMIT_REACHED", { max: IMAGE_POLICY.maxImages }),
      truncated: false,
    };
  }

  return {
    accepted: images.slice(0, available),
    rejection: null,
    truncated: images.length > available,
  };
}
