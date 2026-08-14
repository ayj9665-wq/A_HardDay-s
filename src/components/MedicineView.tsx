import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
} from "react";
import { AppError, toAppError } from "../core/errors";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_POLICY,
  isAllowedImageType,
  remainingImageSlots,
} from "../core/imagePolicy";
import { clamp } from "../core/math";
import { youtubeMusicSearchUrl } from "../domain/medicine";
import {
  analyzeImageLayers,
  prepareImageLayer,
  type CompositeAnalysis,
  type ImageLayer,
  type LayerPlacement,
} from "../lib/imageAnalysis";
import { downloadDroppedImage, extractDroppedImageSources } from "../lib/dropImages";
import { openYoutubeMusicUrl } from "../lib/externalLinks";
import { messageForError } from "../ui/messages";
import { moodLabel } from "../ui/moodLabels";

type MedicineViewProps = {
  hidden?: boolean;
};

type PointerAction = {
  id: string;
  pointerId: number;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
};

export function MedicineView({ hidden = false }: MedicineViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<ImageLayer[]>([]);
  const pointerActionRef = useRef<PointerAction | null>(null);
  const analysisRequestRef = useRef(0);
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CompositeAnalysis | null>(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [importingImage, setImportingImage] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const addFiles = useCallback(async (files: File[], placement?: LayerPlacement) => {
    const images = files.filter((file) => isAllowedImageType(file.type));
    const available = remainingImageSlots(layersRef.current.length);
    if (images.length === 0) {
      setError(new AppError("IMAGE_UNSUPPORTED_TYPE"));
      return;
    }
    if (available === 0) {
      setError(new AppError("IMAGE_LIMIT_REACHED", { max: IMAGE_POLICY.maxImages }));
      return;
    }

    setError(null);
    const accepted = images.slice(0, available);
    const startIndex = layersRef.current.length;
    const prepared = await Promise.allSettled(
      accepted.map((file, index) => prepareImageLayer(file, startIndex + index, placement)),
    );
    const successful = prepared
      .filter((result): result is PromiseFulfilledResult<ImageLayer> => result.status === "fulfilled")
      .map((result) => result.value);
    const failed = prepared.find((result) => result.status === "rejected");

    if (successful.length > 0) {
      setLayers((current) => [...current, ...successful]);
      setSelectedId(successful[successful.length - 1].id);
    }
    if (failed?.status === "rejected") {
      setError(toAppError(failed.reason, "IMAGE_UNREADABLE"));
    } else if (images.length > available) {
      setError(new AppError("IMAGE_LIMIT_TRUNCATED", {
        added: available,
        max: IMAGE_POLICY.maxImages,
      }));
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    const pasteImages = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.type.startsWith("image/"))
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
    if (layers.length === 0) {
      setAnalysis(null);
      return;
    }

    const request = ++analysisRequestRef.current;
    setError(null);
    const timer = window.setTimeout(() => {
      void analyzeImageLayers(layers)
        .then((result) => {
          if (request !== analysisRequestRef.current) return;
          setAnalysis(result);
        })
        .catch((caught) => {
          if (request !== analysisRequestRef.current) return;
          setError(toAppError(caught, "ANALYSIS_FAILED"));
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [layers]);

  useEffect(() => () => {
    analysisRequestRef.current += 1;
    layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));
  }, []);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedId) ?? null,
    [layers, selectedId],
  );

  const updateLayer = (id: string, update: Partial<Pick<ImageLayer, "x" | "y" | "width">>) => {
    setLayers((current) => current.map((layer) =>
      layer.id === id ? { ...layer, ...update } : layer));
  };

  const beginPointerAction = (
    event: PointerEvent<HTMLElement>,
    layer: ImageLayer,
    mode: PointerAction["mode"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(layer.id);
    pointerActionRef.current = {
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

  const movePointer = (event: PointerEvent<HTMLElement>) => {
    const action = pointerActionRef.current;
    const stage = stageRef.current;
    if (!action || action.pointerId !== event.pointerId || !stage) return;
    const bounds = stage.getBoundingClientRect();
    if (action.mode === "move") {
      updateLayer(action.id, {
        x: clamp(action.startX + (event.clientX - action.startClientX) / bounds.width * 100, -20, 120),
        y: clamp(action.startY + (event.clientY - action.startClientY) / bounds.height * 100, -20, 120),
      });
    } else {
      updateLayer(action.id, {
        width: clamp(action.startWidth + (event.clientX - action.startClientX) / bounds.width * 100, 12, 160),
      });
    }
  };

  const finishPointer = (event: PointerEvent<HTMLElement>) => {
    if (pointerActionRef.current?.pointerId === event.pointerId) {
      pointerActionRef.current = null;
    }
  };

  const receiveDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingFiles(false);
    const bounds = stageRef.current?.getBoundingClientRect();
    const placement = bounds ? {
      x: (event.clientX - bounds.left) / bounds.width * 100,
      y: (event.clientY - bounds.top) / bounds.height * 100,
    } : undefined;
    const sources = extractDroppedImageSources(event.dataTransfer);
    if (sources.length === 0) {
      setError(new AppError("DROP_NOT_AN_IMAGE"));
      return;
    }

    const available = remainingImageSlots(layersRef.current.length);
    if (available === 0) {
      setError(new AppError("IMAGE_LIMIT_REACHED", { max: IMAGE_POLICY.maxImages }));
      return;
    }
    const accepted = sources.slice(0, available);
    const localFiles = accepted
      .filter((source) => source.kind === "file")
      .map((source) => source.file);
    if (localFiles.length > 0) {
      await addFiles(localFiles, placement);
      return;
    }

    setImportingImage(true);
    setError(null);
    try {
      const downloads = await Promise.allSettled(
        accepted.filter((source) => source.kind === "url")
          .map((source) => downloadDroppedImage(source.url)),
      );
      const downloadedFiles = downloads
        .filter((result): result is PromiseFulfilledResult<File> => result.status === "fulfilled")
        .map((result) => result.value);
      if (downloadedFiles.length > 0) await addFiles(downloadedFiles, placement);
      const failure = downloads.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") {
        setError(toAppError(failure.reason, "IMAGE_IMPORT_FAILED"));
      }
    } finally {
      setImportingImage(false);
    }
  };

  const removeLayer = (id: string) => {
    const target = layers.find((layer) => layer.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    const remaining = layers.filter((layer) => layer.id !== id);
    setLayers(remaining);
    setSelectedId(remaining.at(-1)?.id ?? null);
  };

  useEffect(() => {
    if (hidden || !selectedId) return;

    const deleteSelectedLayer = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      event.preventDefault();
      removeLayer(selectedId);
    };

    window.addEventListener("keydown", deleteSelectedLayer);
    return () => window.removeEventListener("keydown", deleteSelectedLayer);
  }, [hidden, layers, selectedId]);

  const bringToFront = (id: string) => {
    setLayers((current) => {
      const target = current.find((layer) => layer.id === id);
      return target ? [...current.filter((layer) => layer.id !== id), target] : current;
    });
  };

  const clearAll = () => {
    layers.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));
    setLayers([]);
    setSelectedId(null);
    setAnalysis(null);
    setError(null);
    setCopiedHex(null);
  };

  const copyColor = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((current) => current === hex ? null : current), 1_400);
    } catch {
      setError(new AppError("CLIPBOARD_COPY_FAILED", { hex }));
    }
  };

  const openMusic = (url: string) => {
    setError(null);
    void openYoutubeMusicUrl(url).catch((caught) => {
      setError(toAppError(caught, "MUSIC_OPEN_FAILED"));
    });
  };

  return (
    <section className="medicine-workspace app-view" aria-label="Color medicine" hidden={hidden}>
      <div
        ref={stageRef}
        className={`medicine-capture${draggingFiles ? " medicine-capture--dragging" : ""}${layers.length ? " medicine-capture--ready" : ""}`}
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
        onPointerDown={() => setSelectedId(null)}
      >
        {layers.length === 0 ? (
          <button type="button" className="capture-prompt" onClick={() => inputRef.current?.click()}>
            <span className="capture-mark" aria-hidden="true">+</span>
            <strong>{draggingFiles ? "RELEASE TO ADD" : "DROP IMAGES"}</strong>
            <small>FROM DESKTOP OR WEB · JPG · PNG · CTRL + V</small>
          </button>
        ) : (
          <>
            {layers.map((layer, index) => {
              const style = {
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                zIndex: index + 1,
              };
              return (
                <div
                  key={layer.id}
                  className={`medicine-layer${layer.id === selectedId ? " medicine-layer--selected" : ""}`}
                  style={style}
                  role="button"
                  tabIndex={0}
                  aria-label={`Move ${layer.fileName}`}
                  onPointerDown={(event) => beginPointerAction(event, layer, "move")}
                  onPointerMove={movePointer}
                  onPointerUp={finishPointer}
                  onPointerCancel={finishPointer}
                  onKeyDown={(event) => {
                    const distance = event.shiftKey ? 5 : 1;
                    if (event.key === "ArrowLeft") updateLayer(layer.id, { x: layer.x - distance });
                    if (event.key === "ArrowRight") updateLayer(layer.id, { x: layer.x + distance });
                    if (event.key === "ArrowUp") updateLayer(layer.id, { y: layer.y - distance });
                    if (event.key === "ArrowDown") updateLayer(layer.id, { y: layer.y + distance });
                  }}
                >
                  <img src={layer.previewUrl} alt="" draggable="false" />
                  {layer.id === selectedId && (
                    <button
                      type="button"
                      className="layer-resize-handle"
                      aria-label={`Resize ${layer.fileName}`}
                      onPointerDown={(event) => beginPointerAction(event, layer, "resize")}
                    />
                  )}
                </div>
              );
            })}
          </>
        )}
        {(draggingFiles || importingImage) && (
          <div className="drop-curtain">
            {importingImage ? "IMPORTING WEB IMAGE..." : "RELEASE TO ADD IMAGES"}
          </div>
        )}
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          onChange={(event) => {
            void addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>

      {selectedLayer && (
        <div className="layer-editor">
          <div className="layer-editor-heading">
            <span>IMAGE {String(layers.findIndex((layer) => layer.id === selectedLayer.id) + 1).padStart(2, "0")} / {String(layers.length).padStart(2, "0")}</span>
            <strong title={selectedLayer.fileName}>{selectedLayer.fileName}</strong>
            <button type="button" onClick={() => bringToFront(selectedLayer.id)}>FRONT</button>
            <button type="button" onClick={() => removeLayer(selectedLayer.id)}>DELETE</button>
          </div>
        </div>
      )}

      {error && (
        <p className="medicine-status medicine-status--error" role="alert">
          {messageForError(error)}
        </p>
      )}

      {analysis && layers.length > 0 && (
        <div className="medicine-result">
          <div className="palette" aria-label="Extracted color palette">
            {analysis.palette.map((color) => (
              <button
                key={color.hex}
                type="button"
                className="palette-color"
                style={{ "--palette-color": color.hex } as CSSProperties}
                title={`Copy ${color.hex}`}
                onClick={() => void copyColor(color.hex)}
              >
                <span aria-hidden="true" />
                <strong>{copiedHex === color.hex ? "COPIED" : color.hex}</strong>
              </button>
            ))}
          </div>

          <div className="mood-prescription">
            <div>
              <span className="prescription-label">COLOR PRESCRIPTION</span>
              <h2>{moodLabel(analysis.mood.id)}</h2>
              <p>{analysis.mood.tags.join(" · ")}</p>
            </div>
            <a
              className="music-primary"
              href={youtubeMusicSearchUrl(analysis.mood.searchQueries[0])}
              onClick={(event) => {
                event.preventDefault();
                openMusic(event.currentTarget.href);
              }}
            >
              PLAY ON YOUTUBE MUSIC <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="music-alternatives" aria-label="Alternative music prescriptions">
            <a
              href={youtubeMusicSearchUrl(analysis.mood.searchQueries[0])}
              onClick={(event) => {
                event.preventDefault();
                openMusic(event.currentTarget.href);
              }}
            >
              <span>00</span>
              <span className="music-result-name">{analysis.mood.searchQueries[0].toUpperCase()}</span>
              <b aria-hidden="true">↗</b>
            </a>
            {analysis.recommendedTracks.map((track, index) => (
              <a
                key={track.id}
                href={youtubeMusicSearchUrl(`${track.artist} ${track.title}`)}
                onClick={(event) => {
                  event.preventDefault();
                  openMusic(event.currentTarget.href);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className="music-result-name">
                  <strong>{track.title}</strong> — {track.artist}
                </span>
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>

          <button type="button" className="analyze-again" onClick={clearAll}>ANALYZE AGAIN</button>
        </div>
      )}
    </section>
  );
}
