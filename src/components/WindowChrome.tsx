import { getPlatform } from "../platform";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./ControlIcons";

export function WindowChrome() {
  const platform = getPlatform();
  const windowControls = platform.window;
  if (!windowControls.supported) return null;

  const minimize = (
    <button key="minimize" type="button" aria-label="Minimize window" title="Minimize" onClick={() => void windowControls.minimize()}>
      <MinimizeIcon />
    </button>
  );
  const maximize = (
    <button key="maximize" type="button" aria-label="Maximize or restore window" title="Maximize / Restore" onClick={() => void windowControls.toggleMaximize()}>
      <MaximizeIcon />
    </button>
  );
  const close = (
    <button key="close" type="button" className="window-close" aria-label="Close window" title="Close" onClick={() => void windowControls.close()}>
      <CloseIcon />
    </button>
  );

  // macOS reads close-first from the left; Windows reads close-last from the
  // right. Ordering here rather than in CSS keeps the tab order honest.
  const buttons = platform.os === "macos"
    ? [close, minimize, maximize]
    : [minimize, maximize, close];

  return (
    <div className="window-chrome" aria-label="Window controls">
      {buttons}
    </div>
  );
}
