import { useEffect, useMemo, useState } from "react";
import { AppError, toAppError } from "../core/errors";
import { applicationIdentity, applicationsMatch } from "../core/applications";
import { getPlatform } from "../platform";
import type { LinkedApplication, RunningApplication, Task } from "../types";
import { messageForError } from "../ui/messages";

type ApplicationLinkerProps = {
  task: Task;
  foregroundApplication: RunningApplication | null;
  onSave: (applications: LinkedApplication[]) => void;
  onClose: () => void;
};

export function ApplicationLinker({
  task,
  foregroundApplication,
  onSave,
  onClose,
}: ApplicationLinkerProps) {
  const platform = getPlatform();
  const [running, setRunning] = useState<RunningApplication[]>([]);
  const [selected, setSelected] = useState<LinkedApplication[]>(task.linkedApplications);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      // Whether this OS has an implementation at all, before asking it anything.
      const available = await platform.applications.isSupported();
      setSupported(available);
      setRunning(available ? await platform.applications.listRunning() : []);
    } catch (caught) {
      setError(toAppError(caught, "APPLICATIONS_UNREADABLE"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const applications = useMemo(() => {
    const entries = new Map<string, RunningApplication>();
    task.linkedApplications.forEach((application) => {
      entries.set(applicationIdentity(application), { ...application, detail: "NOT RUNNING" });
    });
    running.forEach((application) => entries.set(applicationIdentity(application), application));
    return [...entries.values()];
  }, [running, task.linkedApplications]);

  const toggle = (application: RunningApplication) => {
    const identity = applicationIdentity(application);
    setSelected((current) => current.some((item) => applicationIdentity(item) === identity)
      ? current.filter((item) => applicationIdentity(item) !== identity)
      : [...current, {
          name: application.name,
          processName: application.processName,
          executablePath: application.executablePath,
          trackedSeconds: 0,
        }]);
  };

  return (
    <div className="application-linker-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="application-linker" role="dialog" aria-modal="true" aria-labelledby="application-linker-title">
        <header>
          <div>
            <span>APPLICATION TRIGGER</span>
            <h2 id="application-linker-title">{task.text}</h2>
          </div>
          <button type="button" className="application-linker-close" onClick={onClose} aria-label="Close application linker">×</button>
        </header>

        <div className="application-list" aria-live="polite">
          {loading && <p className="application-list-message">SCANNING OPEN WINDOWS...</p>}
          {!loading && !supported && (
            <p className="application-list-message">
              {platform.kind === "web"
                ? "APPLICATION TRACKING RUNS IN THE DESKTOP APP ONLY."
                : "APPLICATION TRACKING IS NOT AVAILABLE ON THIS OPERATING SYSTEM."}
            </p>
          )}
          {!loading && supported && applications.length === 0 && (
            <p className="application-list-message">NO OTHER OPEN APPLICATIONS FOUND.</p>
          )}
          {applications.map((application) => {
            const identity = applicationIdentity(application);
            const checked = selected.some((item) => applicationIdentity(item) === identity);
            const active = applicationsMatch(application, foregroundApplication);
            return (
              <label className={`application-option${active ? " application-option--active" : ""}`} key={identity}>
                <input type="checkbox" checked={checked} onChange={() => toggle(application)} />
                <span className="application-option-mark" aria-hidden="true" />
                <span className="application-option-copy">
                  <strong>{application.name}</strong>
                  <small title={application.detail}>{application.detail}</small>
                </span>
                {active && <b>ACTIVE</b>}
              </label>
            );
          })}
        </div>

        {error && (
          <p className="application-linker-error" role="alert">{messageForError(error)}</p>
        )}

        <footer>
          <button
            type="button"
            className="application-refresh"
            disabled={!supported}
            onClick={() => void refresh()}
          >
            REFRESH
          </button>
          <span>{selected.length} LINKED</span>
          <button type="button" className="application-save" onClick={() => onSave(selected)}>SAVE</button>
        </footer>
      </section>
    </div>
  );
}
