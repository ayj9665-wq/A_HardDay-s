import { describe, expect, it } from "vitest";
import { IMAGE_POLICY } from "../core/imagePolicy";
import {
  LAYER_BOUNDS,
  bringToFront,
  keyboardGeometry,
  pointerGeometry,
  selectFilesToAdd,
  selectionAfterRemoval,
  updateLayer,
  withoutLayer,
  type ImageLayer,
  type PointerAction,
} from "./imageLayers";

const layer = (id: string, over: Partial<ImageLayer> = {}): ImageLayer => ({
  id,
  previewUrl: `blob:${id}`,
  fileName: `${id}.png`,
  naturalWidth: 800,
  naturalHeight: 600,
  x: 50,
  y: 50,
  width: 48,
  ...over,
});

const drag = (over: Partial<PointerAction> = {}): PointerAction => ({
  id: "a",
  pointerId: 1,
  mode: "move",
  startClientX: 100,
  startClientY: 100,
  startX: 50,
  startY: 50,
  startWidth: 48,
  ...over,
});

const stage = { width: 500, height: 400 };

const imageFile = (name: string, type = "image/png") =>
  new File(["x"], name, { type });

describe("layer dragging", () => {
  it("translates pixels into a percentage of the stage", () => {
    // A quarter of the stage across, a quarter down.
    const geometry = pointerGeometry(drag(), 100 + 125, 100 + 100, stage);

    expect(geometry).toEqual({ x: 75, y: 75 });
  });

  it("lets a layer overhang the stage but not escape it", () => {
    const farLeft = pointerGeometry(drag(), -10_000, -10_000, stage);
    const farRight = pointerGeometry(drag(), 10_000, 10_000, stage);

    expect(farLeft).toEqual({ x: LAYER_BOUNDS.minPosition, y: LAYER_BOUNDS.minPosition });
    expect(farRight).toEqual({ x: LAYER_BOUNDS.maxPosition, y: LAYER_BOUNDS.maxPosition });
  });

  it("resizes from the horizontal drag only", () => {
    const geometry = pointerGeometry(drag({ mode: "resize" }), 100 + 50, 9_999, stage);

    expect(geometry).toEqual({ width: 58 });
  });

  it("keeps a resized layer between its minimum and maximum width", () => {
    expect(pointerGeometry(drag({ mode: "resize" }), -10_000, 100, stage))
      .toEqual({ width: LAYER_BOUNDS.minWidth });
    expect(pointerGeometry(drag({ mode: "resize" }), 10_000, 100, stage))
      .toEqual({ width: LAYER_BOUNDS.maxWidth });
  });

  it("does nothing when the stage has not been laid out yet", () => {
    expect(pointerGeometry(drag(), 300, 300, { width: 0, height: 0 })).toEqual({});
  });
});

describe("keyboard nudging", () => {
  it("moves by one step, or five while shifted", () => {
    expect(keyboardGeometry(layer("a"), "ArrowLeft")).toEqual({ x: 49 });
    expect(keyboardGeometry(layer("a"), "ArrowRight", false)).toEqual({ x: 55 });
    expect(keyboardGeometry(layer("a"), "ArrowUp")).toEqual({ y: 49 });
    expect(keyboardGeometry(layer("a"), "ArrowDown")).toEqual({ y: 51 });
  });

  it("ignores keys that are not arrows", () => {
    expect(keyboardGeometry(layer("a"), "Enter")).toBeNull();
    expect(keyboardGeometry(layer("a"), "a")).toBeNull();
  });
});

describe("layer ordering", () => {
  it("moves a raised layer to the end, where it paints last", () => {
    const layers = [layer("a"), layer("b"), layer("c")];

    expect(bringToFront(layers, "a").map((one) => one.id)).toEqual(["b", "c", "a"]);
    expect(bringToFront(layers, "c").map((one) => one.id)).toEqual(["a", "b", "c"]);
  });

  it("leaves the stage alone when the layer is gone", () => {
    const layers = [layer("a")];
    expect(bringToFront(layers, "missing")).toBe(layers);
  });

  it("hands the selection to the topmost survivor", () => {
    const layers = [layer("a"), layer("b"), layer("c")];

    expect(selectionAfterRemoval(layers, "c")).toBe("b");
    expect(selectionAfterRemoval(layers, "a")).toBe("c");
    expect(selectionAfterRemoval([layer("a")], "a")).toBeNull();
  });

  it("changes only the layer it is asked to change", () => {
    const layers = [layer("a"), layer("b")];
    const next = updateLayer(layers, "a", { x: 10 });

    expect(next[0].x).toBe(10);
    expect(next[1]).toBe(layers[1]);
    expect(withoutLayer(next, "a").map((one) => one.id)).toEqual(["b"]);
  });
});

describe("accepting files", () => {
  it("takes the supported images and reports nothing wrong", () => {
    const selection = selectFilesToAdd(0, [imageFile("a.png"), imageFile("b.jpg", "image/jpeg")]);

    expect(selection.accepted).toHaveLength(2);
    expect(selection.rejection).toBeNull();
    expect(selection.truncated).toBe(false);
  });

  it("refuses a drop with no supported image in it", () => {
    const selection = selectFilesToAdd(0, [imageFile("a.bmp", "image/bmp"), imageFile("b.txt", "text/plain")]);

    expect(selection.accepted).toEqual([]);
    expect(selection.rejection?.code).toBe("IMAGE_UNSUPPORTED_TYPE");
  });

  it("refuses everything once the stage is full", () => {
    const selection = selectFilesToAdd(IMAGE_POLICY.maxImages, [imageFile("a.png")]);

    expect(selection.accepted).toEqual([]);
    expect(selection.rejection?.code).toBe("IMAGE_LIMIT_REACHED");
  });

  it("takes what fits and says the rest were dropped", () => {
    const room = 2;
    const files = Array.from({ length: 5 }, (_, index) => imageFile(`${index}.png`));
    const selection = selectFilesToAdd(IMAGE_POLICY.maxImages - room, files);

    expect(selection.accepted).toHaveLength(room);
    expect(selection.rejection).toBeNull();
    expect(selection.truncated).toBe(true);
  });
});
