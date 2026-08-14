import { getPlatform } from "../platform";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./ControlIcons";

export function WindowChrome() {
  const windowControls = getPlatform().window;
  if (!windowControls.supported) return null;

  return (
    <div className="window-chrome" aria-label="Window controls">
      <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => void windowControls.minimize()}>
        <MinimizeIcon />
      </button>
      <button type="button" aria-label="Maximize or restore window" title="Maximize / Restore" onClick={() => void windowControls.toggleMaximize()}>
        <MaximizeIcon />
      </button>
      <button type="button" className="window-close" aria-label="Close window" title="Close" onClick={() => void windowControls.close()}>
        <CloseIcon />
      </button>
    </div>
  );
}
