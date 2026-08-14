import { useEffect, useRef, useState } from "react";
import { AppError, toAppError } from "../../core/errors";
import type { ImageLayer } from "../../core/imageLayers";
import { analyzeImageLayers, type CompositeAnalysis } from "../../lib/imageAnalysis";

const SETTLE_MS = 180;

/**
 * Re-analyses the stage after it stops changing. Results from a superseded
 * arrangement are discarded, so dragging never shows a stale prescription.
 */
export function useLayerAnalysis(
  layers: ImageLayer[],
  onError: (error: AppError | null) => void,
): CompositeAnalysis | null {
  const [analysis, setAnalysis] = useState<CompositeAnalysis | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    // Bump first: an in-flight analysis of the previous arrangement must not
    // land after the stage has been emptied.
    const request = ++requestRef.current;

    if (layers.length === 0) {
      setAnalysis(null);
      return;
    }

    onError(null);
    const timer = window.setTimeout(() => {
      void analyzeImageLayers(layers)
        .then((result) => {
          if (request === requestRef.current) setAnalysis(result);
        })
        .catch((caught) => {
          if (request === requestRef.current) onError(toAppError(caught, "ANALYSIS_FAILED"));
        });
    }, SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [layers, onError]);

  useEffect(() => () => {
    requestRef.current += 1;
  }, []);

  return analysis;
}
