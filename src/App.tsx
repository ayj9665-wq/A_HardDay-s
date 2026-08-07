import { useEffect, useMemo, useState } from "react";
import { AnalogClock } from "./components/AnalogClock";
import {
  AddTaskIcon,
  BackgroundIcon,
  BackIcon,
  CloseIcon,
  PinIcon,
  PillIcon,
} from "./components/ControlIcons";
import { MedicineView } from "./components/MedicineView";
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
import type { AppState, ClockHour } from "./types";

const EMPTY_STATE: AppState = {
  tasks: [],
  activeTaskId: null,
  backgroundMode: "solid",
  alwaysOnTop: false,
};

export default function App() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [period, setPeriod] = useState(() => getPeriodLabel(new Date()));
  const [view, setView] = useState<"clock" | "medicine">("clock");

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
    if (!hydrated || !window.__TAURI_INTERNALS__) return;
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().setAlwaysOnTop(state.alwaysOnTop))
      .catch(() => {
        // Keep the rest of the app usable if the platform rejects this window level.
      });
  }, [hydrated, state.alwaysOnTop]);

  useEffect(() => {
    const timer = window.setInterval(() => setPeriod(getPeriodLabel(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const addTask = (text: string, hourSlot: ClockHour): string | null => {
    const cleanText = sanitizeTaskText(text);
    if (!cleanText) return "A task cannot be empty.";
    if (state.tasks.length >= MAX_TASKS) return "You can add up to 6 tasks.";
    if (occupiedHours.has(hourSlot)) return `${hourSlot}'o is already occupied.`;

    const task = createTask(cleanText, hourSlot, state.tasks.length);
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, task],
      activeTaskId: current.activeTaskId ?? task.id,
    }));
    return null;
  };

  const updateTask = (id: string, text: string, hourSlot: ClockHour): string | null => {
    const cleanText = sanitizeTaskText(text);
    if (!cleanText) return "A task cannot be empty.";
    if (state.tasks.some((task) => task.id !== id && task.hourSlot === hourSlot)) {
      return `${hourSlot}'o is already occupied.`;
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

  if (!hydrated) {
    return <div className="app-loading">A Hard Day's</div>;
  }

  return (
    <main className={`app-shell app-shell--${state.backgroundMode} app-shell--${view}`}>
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
        <AnalogClock activeHour={activeTask?.hourSlot ?? null} />
        <div className="task-ring">
          {state.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              index={clockwiseTasks.findIndex((clockwiseTask) => clockwiseTask.id === task.id)}
              active={task.id === state.activeTaskId}
              occupiedHours={occupiedHours}
              onActivate={activateTask}
              onToggle={toggleTask}
              onDelete={deleteTask}
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
    </main>
  );
}
