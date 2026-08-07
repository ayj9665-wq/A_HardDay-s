import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import tapeOne from "../../Design_sources/tape_01.png";
import tapeTwo from "../../Design_sources/tape_02.png";
import { CLOCK_HOURS, type ClockHour, type Task } from "../types";

type TaskCardProps = {
  task: Task;
  index: number;
  active: boolean;
  occupiedHours: Set<ClockHour>;
  onActivate: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string, hourSlot: ClockHour) => string | null;
};

export function TaskCard({
  task,
  index,
  active,
  occupiedHours,
  onActivate,
  onToggle,
  onDelete,
  onUpdate,
}: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [hourSlot, setHourSlot] = useState<ClockHour>(task.hourSlot);
  const [error, setError] = useState("");

  useEffect(() => {
    setText(task.text);
    setHourSlot(task.hourSlot);
  }, [task.text, task.hourSlot]);

  const angle = (task.hourSlot % 12) * 30 - 90;
  const radians = (angle * Math.PI) / 180;
  const cardWidth = Math.min(280, Math.max(190, task.text.length * 9 + 100));
  const finalSpace = task.text.lastIndexOf(" ");
  const firstLine = finalSpace > 0 ? task.text.slice(0, finalSpace) : task.text;
  const secondLine = finalSpace > 0 ? task.text.slice(finalSpace + 1) : "";
  const position = {
    "--task-x": `${50 + Math.cos(radians) * 37}%`,
    "--task-y": `${54 + Math.sin(radians) * 28}%`,
    "--task-width": `${cardWidth}px`,
  } as CSSProperties;

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = onUpdate(task.id, text, hourSlot);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setEditing(false);
  };

  const cancelEdit = () => {
    setText(task.text);
    setHourSlot(task.hourSlot);
    setError("");
    setEditing(false);
  };

  return (
    <article
      className={`task-card ${active ? "task-card--active" : ""} ${task.completed ? "task-card--completed" : ""}`}
      style={position}
      aria-label={`${task.hourSlot}'o, ${task.text}`}
    >
      <span className="task-index">({String(index + 1).padStart(2, "0")})</span>
      <div className="tape-card">
        <img src={task.tapeVariant === 1 ? tapeOne : tapeTwo} alt="" draggable="false" />
        {editing ? (
          <form className="task-edit" onSubmit={submitEdit}>
            <input
              autoFocus
              value={text}
              maxLength={80}
              aria-label="Edit task name"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") cancelEdit();
                if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
              }}
            />
            <select
              value={hourSlot}
              aria-label="Edit task time"
              onChange={(event) => setHourSlot(Number(event.target.value) as ClockHour)}
            >
              {CLOCK_HOURS.map((hour) => (
                <option
                  key={hour}
                  value={hour}
                  disabled={hour !== task.hourSlot && occupiedHours.has(hour)}
                >
                  {hour}'o
                </option>
              ))}
            </select>
            <div className="task-edit-actions">
              <button type="submit">Save</button>
              <button type="button" onClick={cancelEdit}>Cancel</button>
            </div>
            {error && <span className="task-edit-error">{error}</span>}
          </form>
        ) : (
          <button
            type="button"
            className="task-label"
            disabled={task.completed}
            onClick={() => onActivate(task.id)}
            title="Set as active task"
          >
            <strong>
              {firstLine}
              {secondLine && <><br />{secondLine}</>}
            </strong>
            <span>{task.hourSlot}'o</span>
          </button>
        )}
      </div>
      {!editing && (
        <div className="task-actions">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            aria-label={task.completed ? `Mark ${task.text} incomplete` : `Complete ${task.text}`}
            title={task.completed ? "Mark incomplete" : "Complete"}
          >
            {task.completed ? "↶" : "✓"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${task.text}`}
            title="Edit"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            aria-label={`Delete ${task.text}`}
            title="Delete"
          >
            ×
          </button>
        </div>
      )}
    </article>
  );
}
