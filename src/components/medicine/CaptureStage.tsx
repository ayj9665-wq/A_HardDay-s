import { useRef, useState, type DragEvent, type PointerEvent } from "react";
import { AppError, toAppError } from "../../core/errors";
import { IMAGE_ACCEPT_ATTRIBUTE, IMAGE_POLICY, remainingImageSlots } from "../../core/imagePolicy";
import {
  keyboardGeometry,
  pointerGeometry,
  type ImageLayer,
  type LayerGeometry,
  type LayerPlacement,
  type PointerAction,
} from "../../core/imageLayers";
import { downloadDroppedImage, extractDroppedImageSources } from "../../lib/dropImages";
import { getPlatform } from "../../platform";
import { modifierLabel } from "../../ui/shortcuts";

type CaptureStageProps = {
  layers: ImageLayer[];
  selectedId: string | null;
  onSelect(id: string | null): void;
  onMove(id: string, geometry: LayerGeometry): void;
  onAddFiles(files: File[], placement?: LayerPlacement): Promise<void>;
  onError(error: AppError | null): void;
};

export function CaptureStage({
  layers,
  selectedId,
  onSelect,
  onMove,
  onAddFiles,
  onError,
}: CaptureStageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<PointerAction | null>(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [importing, setImporting] = useState(false);

  const beginAction = (
    event: PointerEvent<HTMLElement>,
    layer: ImageLayer,
    mode: PointerAction["mode"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(layer.id);
    actionRef.current = {
      id: layer.id,
      pointerId: event.pointerId,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      startWidth: layer.width,
    };
  };

  const continueAction = (event: PointerEvent<HTMLElement>) => {
    const action = actionRef.current;
    const stage = stageRef.current;
    if (!action || action.pointerId !== event.pointerId || !stage) return;
    onMove(action.id, pointerGeometry(action, event.clientX, event.clientY, stage.getBoundingClientRect()));
  };

  const endAction = (event: PointerEvent<HTMLElement>) => {
    if (actionRef.current?.pointerId === event.pointerId) actionRef.current = null;
  };

  const placementFor = (event: DragEvent<HTMLDivElement>): LayerPlacement | undefined => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return undefined;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  };

  const receiveDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingFiles(false);

    const placement = placementFor(event);
    const sources = extractDroppedImageSources(event.dataTransfer);
    if (sources.length === 0) {
      onError(new AppError("DROP_NOT_AN_IMAGE"));
      return;
    }

    const available = remainingImageSlots(layers.length);
    if (available === 0) {
      onError(new AppError("IMAGE_LIMIT_REACHED", { max: IMAGE_POLICY.maxImages }));
      return;
    }

    const accepted = sources.slice(0, available);
    const localFiles = accepted.filter((source) => source.kind === "file").map((source) => source.file);
    if (localFiles.length > 0) {
      await onAddFiles(localFiles, placement);
      return;
    }

    setImporting(true);
    onError(null);
    try {
      const downloads = await Promise.allSettled(
        accepted.filter((source) => source.kind === "url").map((source) => downloadDroppedImage(source.url)),
      );
      const files = downloads
        .filter((result): result is PromiseFulfilledResult<File> => result.status === "fulfilled")
        .map((result) => result.value);
      if (files.length > 0) await onAddFiles(files, placement);

      const failure = downloads.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") onError(toAppError(failure.reason, "IMAGE_IMPORT_FAILED"));
    } finally {
      setImporting(false);
    }
  };

  const stageClass = [
    "medicine-capture",
    draggingFiles ? "medicine-capture--dragging" : "",
    layers.length ? "medicine-capture--ready" : "",
  ].join(" ").replace(/\s+/g, " ").trim();

  return (
    <div
      ref={stageRef}
      className={stageClass}
      onDragEnter={(event) => {
        event.preventDefault();
        setDraggingFiles(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        const target = event.relatedTarget;
        if (!(target instanceof Node) || !event.currentTarget.contains(target)) setDraggingFiles(false);
      }}
      onDrop={(event) => void receiveDrop(event)}
      onPointerDown={() => onSelect(null)}
    >
      {layers.length === 0 ? (
        <button type="button" className="capture-prompt" onClick={() => inputRef.current?.click()}>
          <span className="capture-mark" aria-hidden="true">+</span>
          <strong>{draggingFiles ? "RELEASE TO ADD" : "DROP IMAGES"}</strong>
          <small>FROM DESKTOP OR WEB · JPG · PNG · {modifierLabel(getPlatform().os)} + V</small>
        </button>
      ) : (
        layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`medicine-layer${layer.id === selectedId ? " medicine-layer--selected" : ""}`}
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              zIndex: index + 1,
            }}
            role="button"
            tabIndex={0}
            aria-label={`Move ${layer.fileName}`}
            onPointerDown={(event) => beginAction(event, layer, "move")}
            onPointerMove={continueAction}
            onPointerUp={endAction}
            onPointerCancel={endAction}
            onKeyDown={(event) => {
              const geometry = keyboardGeometry(layer, event.key, !event.shiftKey);
              if (geometry) onMove(layer.id, geometry);
            }}
          >
            <img src={layer.previewUrl} alt="" draggable="false" />
            {layer.id === selectedId && (
              <button
                type="button"
                className="layer-resize-handle"
                aria-label={`Resize ${layer.fileName}`}
                onPointerDown={(event) => beginAction(event, layer, "resize")}
              />
            )}
          </div>
        ))
      )}

      {(draggingFiles || importing) && (
        <div className="drop-curtain">
          {importing ? "IMPORTING WEB IMAGE..." : "RELEASE TO ADD IMAGES"}
        </div>
      )}

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        multiple
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          void onAddFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
