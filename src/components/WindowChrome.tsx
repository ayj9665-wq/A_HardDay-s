import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./ControlIcons";

type WindowAction = "minimize" | "maximize" | "close";

async function runWindowAction(action: WindowAction) {
  if (!window.__TAURI_INTERNALS__) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  if (action === "minimize") await appWindow.minimize();
  else if (action === "maximize") await appWindow.toggleMaximize();
  else await appWindow.close();
}

export function WindowChrome() {
  if (!window.__TAURI_INTERNALS__) return null;

  return (
    <div className="window-chrome" aria-label="Window controls">
      <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => void runWindowAction("minimize")}>
        <MinimizeIcon />
      </button>
      <button type="button" aria-label="Maximize or restore window" title="Maximize / Restore" onClick={() => void runWindowAction("maximize")}>
        <MaximizeIcon />
      </button>
      <button type="button" className="window-close" aria-label="Close window" title="Close" onClick={() => void runWindowAction("close")}>
        <CloseIcon />
      </button>
    </div>
  );
}
