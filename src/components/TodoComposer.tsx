import { useEffect, useState, type FormEvent } from "react";
import { MAX_TASKS } from "../domain/tasks";
import { CLOCK_HOURS, type ClockHour } from "../types";

type TodoComposerProps = {
  taskCount: number;
  occupiedHours: Set<ClockHour>;
  defaultHour: ClockHour | null;
  onAdd: (text: string, hourSlot: ClockHour) => string | null;
};

export function TodoComposer({
  taskCount,
  occupiedHours,
  defaultHour,
  onAdd,
}: TodoComposerProps) {
  const [text, setText] = useState("");
  const [hourSlot, setHourSlot] = useState<ClockHour | null>(defaultHour);
  const [error, setError] = useState("");
  const isFull = taskCount >= MAX_TASKS;

  useEffect(() => {
    if (hourSlot === null || occupiedHours.has(hourSlot)) setHourSlot(defaultHour);
  }, [defaultHour, hourSlot, occupiedHours]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (hourSlot === null) {
      setError("Please select a time slot.");
      return;
    }
    const validationError = onAdd(text, hourSlot);
    if (validationError) {
      setError(validationError);
      return;
    }
    setText("");
    setError("");
  };

  return (
    <form className="todo-composer glass-panel" onSubmit={submit}>
      <div className="composer-heading">
        <label htmlFor="todo-input">New Task</label>
        <span>{taskCount} / {MAX_TASKS}</span>
      </div>
      <div className="composer-row">
        <input
          id="todo-input"
          value={text}
          maxLength={80}
          disabled={isFull}
          placeholder={isFull ? "You can add up to 6 tasks" : "Enter a task"}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
          }}
        />
        <button className="add-button" type="submit" disabled={isFull || hourSlot === null}>
          Add
        </button>
      </div>
      <fieldset className="hour-picker" disabled={isFull}>
        <legend>Time Slot</legend>
        <div className="hour-options">
          {CLOCK_HOURS.map((hour) => {
            const occupied = occupiedHours.has(hour);
            return (
              <button
                key={hour}
                type="button"
                className={hourSlot === hour ? "hour-option hour-option--selected" : "hour-option"}
                disabled={occupied}
                aria-pressed={hourSlot === hour}
                title={occupied ? `${hour}'o is already occupied` : `Place at ${hour}'o`}
                onClick={() => setHourSlot(hour)}
              >
                {hour}'o
              </button>
            );
          })}
        </div>
      </fieldset>
      <p className={error ? "composer-message composer-message--error" : "composer-message"} role="status">
        {error || (isFull ? "Delete an existing task to add a new one." : "Press Enter to add a task.")}
      </p>
    </form>
  );
}
