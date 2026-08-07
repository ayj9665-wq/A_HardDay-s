import html2canvas from "html2canvas";

export type ScreenshotView = "clock" | "medicine";

export function formatScreenshotFileName(view: ScreenshotView, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `a-hard-days-${view}-${stamp}.png`;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG ENCODING FAILED."));
    }, "image/png");
  });
}

function downloadInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function saveBlob(blob: Blob, fileName: string) {
  if (!window.__TAURI_INTERNALS__) {
    downloadInBrowser(blob, fileName);
    return true;
  }

  const [{ save }, { writeFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const path = await save({
    title: "Save current view as PNG",
    defaultPath: fileName,
    filters: [{ name: "PNG image", extensions: ["png"] }],
  });
  if (!path) return false;

  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return true;
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
  const blob = await canvasToBlob(canvas);
  return saveBlob(blob, formatScreenshotFileName(view));
}
