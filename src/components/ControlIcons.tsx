import type { BackgroundMode } from "../types";

type IconProps = {
  className?: string;
};

export function PillIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon control-icon--pill ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(-35 12 12)">
        <rect x="3" y="7" width="18" height="10" rx="5" fill="#ffffff" />
        <path d="M8 7h4v10H8A5 5 0 0 1 8 7Z" fill="#d80019" />
        <rect x="3" y="7" width="18" height="10" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

export function BackIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function BackgroundIcon({ mode, className = "" }: IconProps & { mode: BackgroundMode }) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        fill={mode === "solid" ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      {mode === "clear" && <path d="M6 17 17 6M11 19l8-8" fill="none" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  );
}

export function AddTaskIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export function ApplicationIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 18h5M9.5 14v4M15 10.5h2.5a3 3 0 0 1 0 6H16M12 16.5H9.5a3 3 0 0 1 0-6H11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export function PinIcon({ active, className = "" }: IconProps & { active: boolean }) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5Z"
        fill={active ? "#d80019" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 13v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export function SnapshotIcon({ saving, className = "" }: IconProps & { saving: boolean }) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.2 7 9.6 4.8h4.8L15.8 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.8" cy="10" r="1" fill="currentColor" />
      {saving && <circle cx="19" cy="5" r="2.3" fill="#d80019" />}
    </svg>
  );
}

export function MinimizeIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16h12" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function MaximizeIcon({ className = "" }: IconProps) {
  return (
    <svg className={`control-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
