import { useEffect, useMemo, useState } from "react";
import { AnalogClock } from "./components/AnalogClock";
import { TaskCard } from "./components/TaskCard";
import { TodoComposer } from "./components/TodoComposer";
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
};

export default function App() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [period, setPeriod] = useState(() => getPeriodLabel(new Date()));

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
    if (!window.__TAURI_INTERNALS__) return;
    let cancelled = false;
    let timer: number | undefined;
    let decorated: boolean | null = null;

    void import("@tauri-apps/api/window").then(({ cursorPosition, getCurrentWindow }) => {
      const appWindow = getCurrentWindow();

      const pollWindowHover = async () => {
        try {
          const [cursor, position, size] = await Promise.all([
            cursorPosition(),
            appWindow.outerPosition(),
            appWindow.outerSize(),
          ]);
          const cursorIsInside =
            cursor.x >= position.x &&
            cursor.x <= position.x + size.width &&
            cursor.y >= position.y &&
            cursor.y <= position.y + size.height;

          if (cursorIsInside !== decorated) {
            decorated = cursorIsInside;
            const contentSize = await appWindow.innerSize();
            await appWindow.setDecorations(cursorIsInside);
            await appWindow.setSize(contentSize);
          }
        } catch {
          // Keep the app usable if a platform does not support dynamic decorations.
        } finally {
          if (!cancelled) timer = window.setTimeout(pollWindowHover, 120);
        }
      };

      void pollWindowHover();
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setPeriod(getPeriodLabel(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const openComposer = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setComposerOpen(true);
      }
    };
    window.addEventListener("keydown", openComposer);
    return () => window.removeEventListener("keydown", openComposer);
  }, []);

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
    <main className={`app-shell app-shell--${state.backgroundMode}`}>
      <header className="app-header" data-tauri-drag-region>
        <h1 data-tauri-drag-region>A Hard Day's <span data-tauri-drag-region>{period}</span></h1>
      </header>

      <section
        className="clock-workspace"
        aria-label="Task clock"
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

      <div className="manage-controls">
        <button
          type="button"
          className="background-toggle"
          data-mode={state.backgroundMode}
          aria-label={`Current background: ${state.backgroundMode}. Switch mode`}
          title="Switch background: SOLID → CLEAR"
          onClick={() => setState((current) => ({
            ...current,
            backgroundMode: getNextBackgroundMode(current.backgroundMode),
          }))}
        >
          BG {state.backgroundMode.toUpperCase()}
        </button>
        <button
          type="button"
          className="manage-toggle"
          aria-expanded={composerOpen}
          title="Manage tasks (Ctrl+N)"
          onClick={() => setComposerOpen((open) => !open)}
        >
          {composerOpen ? "CLOSE" : "+ TASK"}
        </button>
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
