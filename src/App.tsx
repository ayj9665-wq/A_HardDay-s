import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalogClock } from "./components/AnalogClock";
import { ApplicationLinker } from "./components/ApplicationLinker";
import {
  AddTaskIcon,
  BackgroundIcon,
  BackIcon,
  CloseIcon,
  PinIcon,
  PillIcon,
  SnapshotIcon,
} from "./components/ControlIcons";
import { MedicineView } from "./components/MedicineView";
import { AppError } from "./core/errors";
import { TaskCard } from "./components/TaskCard";
import { TodoComposer } from "./components/TodoComposer";
import { WindowChrome } from "./components/WindowChrome";
import {
  MAX_TASKS,
  createTask,
  getDefaultHour,
  getHourPriority,
  getNextBackgroundMode,
  getPeriodLabel,
  normalizeState,
  pickNextActiveTask,
  sanitizeTaskText,
} from "./domain/tasks";
import { loadAppState, saveAppState } from "./lib/storage";
import { applicationsMatch } from "./lib/appTracking";
import { saveCurrentViewAsPng } from "./lib/screenshot";
import { getPlatform } from "./platform";
import type { AppState, ClockHour, LinkedApplication, RunningApplication } from "./types";

const EMPTY_STATE: AppState = {
  tasks: [],
  activeTaskId: null,
  backgroundMode: "solid",
  alwaysOnTop: false,
};

export default function App() {
  const platform = getPlatform();
  const appShellRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [period, setPeriod] = useState(() => getPeriodLabel(new Date()));
  const [view, setView] = useState<"clock" | "medicine">("clock");
  const [linkingTaskId, setLinkingTaskId] = useState<string | null>(null);
  const [foregroundApplication, setForegroundApplication] = useState<RunningApplication | null>(null);
  const [savingScreenshot, setSavingScreenshot] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAppState()
      .then((stored) => {
        if (mounted) setState(normalizeState(stored));
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveAppState(state);
  }, [hydrated, state]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "transparent-mode",
      state.backgroundMode !== "solid",
    );
    return () => document.documentElement.classList.remove("transparent-mode");
  }, [state.backgroundMode]);

  useEffect(() => {
    if (!hydrated || !platform.window.supported) return;
    void platform.window.setAlwaysOnTop(state.alwaysOnTop).catch(() => {
      // Keep the rest of the app usable if the platform rejects this window level.
    });
  }, [hydrated, platform, state.alwaysOnTop]);

  useEffect(() => {
    const timer = window.setInterval(() => setPeriod(getPeriodLabel(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || !platform.applications.supported) return;
    let mounted = true;
    const poll = () => {
      void platform.applications.getForeground()
        .then((application) => {
          if (mounted) setForegroundApplication(application);
        })
        .catch(() => {
          if (mounted) setForegroundApplication(null);
        });
    };
    poll();
    const timer = window.setInterval(poll, 700);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [hydrated, platform]);

  useEffect(() => {
    const openComposer = (event: globalThis.KeyboardEvent) => {
      if (view === "clock" && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setComposerOpen(true);
      }
    };
    window.addEventListener("keydown", openComposer);
    return () => window.removeEventListener("keydown", openComposer);
  }, [view]);

  const occupiedHours = useMemo(
    () => new Set(state.tasks.map((task) => task.hourSlot)),
    [state.tasks],
  );
  const defaultHour = getDefaultHour(state.tasks);
  const clockwiseTasks = useMemo(
    () => [...state.tasks].sort(
      (a, b) => getHourPriority(a.hourSlot) - getHourPriority(b.hourSlot),
    ),
    [state.tasks],
  );
  const activeTask = state.tasks.find(
    (task) => task.id === state.activeTaskId && !task.completed,
  );
  const linkingTask = state.tasks.find((task) => task.id === linkingTaskId) ?? null;
  const activeLinkedApplication = activeTask?.linkedApplications.find(
    (application) => applicationsMatch(application, foregroundApplication),
  ) ?? null;
  const activeApplicationPath = activeLinkedApplication?.executablePath ?? null;
  const isTracking = activeLinkedApplication !== null;

  const addTrackedSeconds = useCallback((
    taskId: string,
    executablePath: string,
    seconds: number,
  ) => {
    if (seconds <= 0) return;
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId
        ? {
            ...task,
            trackedSeconds: task.trackedSeconds + seconds,
            linkedApplications: task.linkedApplications.map((application) =>
              application.executablePath.toLocaleLowerCase() === executablePath.toLocaleLowerCase()
                ? { ...application, trackedSeconds: application.trackedSeconds + seconds }
                : application),
            updatedAt: new Date().toISOString(),
          }
        : task),
    }));
  }, []);

  useEffect(() => {
    const taskId = activeTask?.id;
    if (!taskId || !activeApplicationPath) return;

    let lastSample = performance.now();
    let pendingSeconds = 0;
    const sample = () => {
      const now = performance.now();
      pendingSeconds += Math.min((now - lastSample) / 1_000, 1.5);
      lastSample = now;
      if (pendingSeconds >= 5) {
        addTrackedSeconds(taskId, activeApplicationPath, pendingSeconds);
        pendingSeconds = 0;
      }
    };
    const timer = window.setInterval(sample, 500);

    return () => {
      window.clearInterval(timer);
      sample();
      if (pendingSeconds >= 0.05) {
        addTrackedSeconds(taskId, activeApplicationPath, pendingSeconds);
      }
    };
  }, [activeApplicationPath, activeTask?.id, addTrackedSeconds]);

  const addTask = (text: string, hourSlot: ClockHour): AppError | null => {
    const cleanText = sanitizeTaskText(text);
    if (!cleanText) return new AppError("TASK_TEXT_EMPTY");
    if (state.tasks.length >= MAX_TASKS) return new AppError("TASK_LIMIT_REACHED", { max: MAX_TASKS });
    if (occupiedHours.has(hourSlot)) return new AppError("TASK_HOUR_TAKEN", { hour: hourSlot });

    const task = createTask(cleanText, hourSlot, state.tasks.length);
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, task],
      activeTaskId: current.activeTaskId ?? task.id,
    }));
    return null;
  };

  const updateTask = (id: string, text: string, hourSlot: ClockHour): AppError | null => {
    const cleanText = sanitizeTaskText(text);
    if (!cleanText) return new AppError("TASK_TEXT_EMPTY");
    if (state.tasks.some((task) => task.id !== id && task.hourSlot === hourSlot)) {
      return new AppError("TASK_HOUR_TAKEN", { hour: hourSlot });
    }
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? { ...task, text: cleanText, hourSlot, updatedAt: new Date().toISOString() }
          : task,
      ),
    }));
    return null;
  };

  const toggleTask = (id: string) => {
    setState((current) => {
      const target = current.tasks.find((task) => task.id === id);
      if (!target) return current;
      const completing = !target.completed;
      const tasks = current.tasks.map((task) =>
        task.id === id
          ? { ...task, completed: completing, updatedAt: new Date().toISOString() }
          : task,
      );

      let activeTaskId = current.activeTaskId;
      if (completing && current.activeTaskId === id) {
        activeTaskId = pickNextActiveTask(tasks, target.hourSlot, id);
      } else if (!completing && activeTaskId === null) {
        activeTaskId = id;
      }
      return { ...current, tasks, activeTaskId };
    });
  };

  const deleteTask = (id: string) => {
    setState((current) => {
      const deleted = current.tasks.find((task) => task.id === id);
      if (!deleted) return current;
      const tasks = current.tasks
        .filter((task) => task.id !== id)
        .map((task, order) => ({ ...task, order }));
      const activeTaskId =
        current.activeTaskId === id
          ? pickNextActiveTask(tasks, deleted.hourSlot, id)
          : current.activeTaskId;
      return { ...current, tasks, activeTaskId };
    });
  };

  const activateTask = (id: string) => {
    setState((current) => {
      const target = current.tasks.find((task) => task.id === id);
      if (!target || target.completed) return current;
      return { ...current, activeTaskId: id };
    });
  };

  const saveLinkedApplications = (applications: LinkedApplication[]) => {
    if (!linkingTaskId) return;
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === linkingTaskId
        ? { ...task, linkedApplications: applications, updatedAt: new Date().toISOString() }
        : task),
    }));
    setLinkingTaskId(null);
  };

  if (!hydrated) {
    return <div className="app-loading">A Hard Day's</div>;
  }

  return (
    <main ref={appShellRef} className={`app-shell app-shell--${state.backgroundMode} app-shell--${view}`}>
      <WindowChrome />
      <header className="app-header">
        <h1 data-tauri-drag-region>
          A Hard Day's <span data-tauri-drag-region>{view === "medicine" ? "medicine" : period}</span>
        </h1>
      </header>

      <section
        className="clock-workspace app-view"
        aria-label="Task clock"
        hidden={view !== "clock"}
        onDoubleClick={(event) => {
          if (event.target === event.currentTarget) setComposerOpen(true);
        }}
      >
        <AnalogClock
          activeHour={activeTask?.hourSlot ?? null}
          trackedSeconds={activeTask?.trackedSeconds ?? 0}
          tracking={isTracking}
        />
        <div className="task-ring">
          {state.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              index={clockwiseTasks.findIndex((clockwiseTask) => clockwiseTask.id === task.id)}
              active={task.id === state.activeTaskId}
              applicationActive={task.id === state.activeTaskId && isTracking}
              occupiedHours={occupiedHours}
              onActivate={activateTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onManageApplications={setLinkingTaskId}
              onUpdate={updateTask}
            />
          ))}
        </div>
        {state.tasks.length === 0 && (
          <p className="empty-state">ADD YOUR FIRST TASK</p>
        )}
      </section>
      <MedicineView hidden={view !== "medicine"} />

      <button
        type="button"
        className="record-toggle"
        aria-pressed={view === "medicine"}
        aria-label={view === "medicine" ? "Back to clock" : "Open medicine"}
        title={view === "medicine" ? "Back to clock" : "Open medicine"}
        onClick={() => {
          setComposerOpen(false);
          setView((current) => current === "clock" ? "medicine" : "clock");
        }}
      >
        {view === "medicine" ? <BackIcon /> : <PillIcon />}
      </button>

      <div className="manage-controls">
        <button
          type="button"
          className="snapshot-toggle"
          data-screenshot-ignore
          disabled={savingScreenshot}
          aria-label="Save current view as PNG"
          title="Save current view as PNG"
          onClick={() => {
            const shell = appShellRef.current;
            if (!shell || savingScreenshot) return;
            setSavingScreenshot(true);
            setScreenshotStatus(null);
            void saveCurrentViewAsPng(shell, view, state.backgroundMode === "clear")
              .then((saved) => {
                if (!saved) return;
                setScreenshotStatus("PNG SAVED");
                window.setTimeout(() => setScreenshotStatus(null), 1_800);
              })
              .catch(() => {
                setScreenshotStatus("PNG SAVE FAILED");
                window.setTimeout(() => setScreenshotStatus(null), 2_400);
              })
              .finally(() => setSavingScreenshot(false));
          }}
        >
          <SnapshotIcon saving={savingScreenshot} />
        </button>
        <button
          type="button"
          className="pin-toggle"
          aria-pressed={state.alwaysOnTop}
          aria-label={state.alwaysOnTop ? "Disable always on top" : "Keep window always on top"}
          title={state.alwaysOnTop ? "Always on top: On" : "Always on top: Off"}
          onClick={() => setState((current) => ({
            ...current,
            alwaysOnTop: !current.alwaysOnTop,
          }))}
        >
          <PinIcon active={state.alwaysOnTop} />
        </button>
        <button
          type="button"
          className="background-toggle"
          data-mode={state.backgroundMode}
          aria-label={`Current background: ${state.backgroundMode}. Switch mode`}
          title={`Background: ${state.backgroundMode}. Click to switch`}
          onClick={() => setState((current) => ({
            ...current,
            backgroundMode: getNextBackgroundMode(current.backgroundMode),
          }))}
        >
          <BackgroundIcon mode={state.backgroundMode} />
        </button>
        {view === "clock" && (
          <button
            type="button"
            className="manage-toggle"
            aria-expanded={composerOpen}
            aria-label={composerOpen ? "Close task manager" : "Add task"}
            title={composerOpen ? "Close task manager" : "Add task (Ctrl+N)"}
            onClick={() => setComposerOpen((open) => !open)}
          >
            {composerOpen ? <CloseIcon /> : <AddTaskIcon />}
          </button>
        )}
      </div>

      {screenshotStatus && (
        <div className="screenshot-status" data-screenshot-ignore role="status">
          {screenshotStatus}
        </div>
      )}

      {composerOpen && (
        <div className="composer-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setComposerOpen(false);
        }}>
          <TodoComposer
            taskCount={state.tasks.length}
            occupiedHours={occupiedHours}
            defaultHour={defaultHour}
            onAdd={addTask}
          />
        </div>
      )}

      {linkingTask && (
        <ApplicationLinker
          task={linkingTask}
          foregroundApplication={foregroundApplication}
          onSave={saveLinkedApplications}
          onClose={() => setLinkingTaskId(null)}
        />
      )}
    </main>
  );
}
