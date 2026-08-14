import type { ImageLayer } from "../../domain/imageLayers";

type LayerEditorProps = {
  layers: ImageLayer[];
  layer: ImageLayer;
  onRaise(id: string): void;
  onRemove(id: string): void;
};

const ordinal = (value: number) => String(value).padStart(2, "0");

export function LayerEditor({ layers, layer, onRaise, onRemove }: LayerEditorProps) {
  const position = layers.findIndex((candidate) => candidate.id === layer.id) + 1;

  return (
    <div className="layer-editor">
      <div className="layer-editor-heading">
        <span>IMAGE {ordinal(position)} / {ordinal(layers.length)}</span>
        <strong title={layer.fileName}>{layer.fileName}</strong>
        <button type="button" onClick={() => onRaise(layer.id)}>FRONT</button>
        <button type="button" onClick={() => onRemove(layer.id)}>DELETE</button>
      </div>
    </div>
  );
}
