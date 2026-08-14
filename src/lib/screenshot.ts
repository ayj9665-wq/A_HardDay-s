import html2canvas from "html2canvas";
import { AppError } from "../core/errors";
import { getPlatform } from "../platform";

export type ScreenshotView = "clock" | "medicine";

export function formatScreenshotFileName(view: ScreenshotView, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `a-hard-days-${view}-${stamp}.png`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new AppError("PNG_ENCODING_FAILED"));
    }, "image/png");
  });
}

export async function saveCurrentViewAsPng(
  element: HTMLElement,
  view: ScreenshotView,
  transparent: boolean,
) {
  const canvas = await html2canvas(element, {
    backgroundColor: transparent ? null : "#f7f6f1",
    scale: Math.min(window.devicePixelRatio || 1, 2),
    logging: false,
    useCORS: true,
    ignoreElements: (target) => target.hasAttribute("data-screenshot-ignore"),
    width: element.clientWidth,
    height: element.clientHeight,
    windowWidth: element.clientWidth,
    windowHeight: element.clientHeight,
  });
  return getPlatform().files.save({
    data: await canvasToBlob(canvas),
    suggestedName: formatScreenshotFileName(view),
    dialogTitle: "Save current view as PNG",
    filter: { name: "PNG image", extensions: ["png"] },
  });
}
