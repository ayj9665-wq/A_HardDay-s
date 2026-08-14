import { useCallback, useEffect, useState } from "react";
import type { AppError } from "../core/errors";
import { isAllowedImageType } from "../core/imagePolicy";
import { CaptureStage } from "./medicine/CaptureStage";
import { LayerEditor } from "./medicine/LayerEditor";
import { Prescription } from "./medicine/Prescription";
import { useImageLayers } from "./medicine/useImageLayers";
import { useLayerAnalysis } from "./medicine/useLayerAnalysis";
import { messageForError } from "../ui/messages";

type MedicineViewProps = {
  hidden?: boolean;
};

/** True when a keystroke is meant for a text field rather than the stage. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function MedicineView({ hidden = false }: MedicineViewProps) {
  const [error, setError] = useState<AppError | null>(null);
  const reportError = useCallback((next: AppError | null) => setError(next), []);

  const stage = useImageLayers(reportError);
  const analysis = useLayerAnalysis(stage.layers, reportError);

  const { addFiles, remove, selectedId } = stage;

  useEffect(() => {
    if (hidden) return;

    const pasteImages = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])]
        .filter((item) => isAllowedImageType(item.type))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length === 0) return;
      event.preventDefault();
      void addFiles(files);
    };

    window.addEventListener("paste", pasteImages);
    return () => window.removeEventListener("paste", pasteImages);
  }, [addFiles, hidden]);

  useEffect(() => {
    if (hidden || !selectedId) return;

    const deleteSelected = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || isTypingTarget(event.target)) return;
      event.preventDefault();
      remove(selectedId);
    };

    window.addEventListener("keydown", deleteSelected);
    return () => window.removeEventListener("keydown", deleteSelected);
  }, [hidden, remove, selectedId]);

  const startOver = () => {
    stage.clear();
    setError(null);
  };

  return (
    <section className="medicine-workspace app-view" aria-label="Color medicine" hidden={hidden}>
      <CaptureStage
        layers={stage.layers}
        selectedId={stage.selectedId}
        onSelect={stage.select}
        onMove={stage.move}
        onAddFiles={stage.addFiles}
        onError={reportError}
      />

      {stage.selectedLayer && (
        <LayerEditor
          layers={stage.layers}
          layer={stage.selectedLayer}
          onRaise={stage.raise}
          onRemove={stage.remove}
        />
      )}

      {error && (
        <p className="medicine-status medicine-status--error" role="alert">
          {messageForError(error)}
        </p>
      )}

      {analysis && stage.layers.length > 0 && (
        <Prescription analysis={analysis} onError={reportError} onStartOver={startOver} />
      )}
    </section>
  );
}
