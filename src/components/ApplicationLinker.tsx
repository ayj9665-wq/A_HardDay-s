import { useEffect, useMemo, useState } from "react";
import { applicationIdentity, applicationsMatch, listRunningApplications } from "../lib/appTracking";
import type { LinkedApplication, RunningApplication, Task } from "../types";

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
  const [running, setRunning] = useState<RunningApplication[]>([]);
  const [selected, setSelected] = useState<LinkedApplication[]>(task.linkedApplications);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setRunning(await listRunningApplications());
    } catch {
      setError("RUNNING APPLICATIONS COULD NOT BE READ.");
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
      entries.set(applicationIdentity(application), { ...application, windowTitle: "NOT RUNNING" });
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
          {!loading && applications.length === 0 && (
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
                  <small title={application.windowTitle}>{application.windowTitle}</small>
                </span>
                {active && <b>ACTIVE</b>}
              </label>
            );
          })}
        </div>

        {error && <p className="application-linker-error" role="alert">{error}</p>}

        <footer>
          <button type="button" className="application-refresh" onClick={() => void refresh()}>REFRESH</button>
          <span>{selected.length} LINKED</span>
          <button type="button" className="application-save" onClick={() => onSave(selected)}>SAVE</button>
        </footer>
      </section>
    </div>
  );
}
