import { useCallback, useEffect, useRef, useState } from "react";
import { AppError, toAppError } from "../../core/errors";
import { IMAGE_POLICY } from "../../core/imagePolicy";
import {
  bringToFront,
  selectFilesToAdd,
  selectionAfterRemoval,
  updateLayer,
  withoutLayer,
  type ImageLayer,
  type LayerGeometry,
  type LayerPlacement,
} from "../../domain/imageLayers";
import { prepareImageLayer } from "../../lib/imageAnalysis";

export type ImageLayersApi = {
  layers: ImageLayer[];
  selectedId: string | null;
  selectedLayer: ImageLayer | null;
  select(id: string | null): void;
  addFiles(files: File[], placement?: LayerPlacement): Promise<void>;
  move(id: string, geometry: LayerGeometry): void;
  remove(id: string): void;
  raise(id: string): void;
  clear(): void;
};

/**
 * Owns the stage's layers and the object URLs behind them. Every preview URL
 * created here is revoked here, including on unmount.
 */
export function useImageLayers(onError: (error: AppError | null) => void): ImageLayersApi {
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layersRef = useRef<ImageLayer[]>([]);

  layersRef.current = layers;

  useEffect(() => () => {
    layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));
  }, []);

  const addFiles = useCallback(async (files: File[], placement?: LayerPlacement) => {
    const startIndex = layersRef.current.length;
    const { accepted, rejection, truncated } = selectFilesToAdd(startIndex, files);
    if (rejection) {
      onError(rejection);
      return;
    }

    onError(null);
    const prepared = await Promise.allSettled(
      accepted.map((file, index) => prepareImageLayer(file, startIndex + index, placement)),
    );
    const ready = prepared
      .filter((result): result is PromiseFulfilledResult<ImageLayer> => result.status === "fulfilled")
      .map((result) => result.value);

    if (ready.length > 0) {
      setLayers((current) => [...current, ...ready]);
      setSelectedId(ready[ready.length - 1].id);
    }

    const failure = prepared.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") {
      onError(toAppError(failure.reason, "IMAGE_UNREADABLE"));
    } else if (truncated) {
      onError(new AppError("IMAGE_LIMIT_TRUNCATED", {
        added: accepted.length,
        max: IMAGE_POLICY.maxImages,
      }));
    }
  }, [onError]);

  const remove = useCallback((id: string) => {
    const target = layersRef.current.find((layer) => layer.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setSelectedId(selectionAfterRemoval(layersRef.current, id));
    setLayers((current) => withoutLayer(current, id));
  }, []);

  const clear = useCallback(() => {
    layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));
    setLayers([]);
    setSelectedId(null);
  }, []);

  return {
    layers,
    selectedId,
    selectedLayer: layers.find((layer) => layer.id === selectedId) ?? null,
    select: setSelectedId,
    addFiles,
    move: useCallback((id, geometry) => setLayers((current) => updateLayer(current, id, geometry)), []),
    remove,
    raise: useCallback((id) => setLayers((current) => bringToFront(current, id)), []),
    clear,
  };
}
