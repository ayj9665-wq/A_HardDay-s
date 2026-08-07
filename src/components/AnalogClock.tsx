import { useEffect, useRef } from "react";
import { hourToAngle } from "../domain/tasks";
import type { ClockHour } from "../types";

type AnalogClockProps = {
  activeHour: ClockHour | null;
};

function rotateHand(element: SVGLineElement | null, angle: number): void {
  element?.setAttribute("transform", `rotate(${angle} 180 180)`);
}

export function AnalogClock({ activeHour }: AnalogClockProps) {
  const hourHandRef = useRef<SVGLineElement>(null);
  const minuteHandRef = useRef<SVGLineElement>(null);
  const secondHandRef = useRef<SVGLineElement>(null);
  const digitalRef = useRef<HTMLTimeElement>(null);
  const activeHourRef = useRef<ClockHour | null>(activeHour);

  useEffect(() => {
    activeHourRef.current = activeHour;
    if (activeHour !== null) {
      rotateHand(secondHandRef.current, hourToAngle(activeHour));
    }
  }, [activeHour]);

  useEffect(() => {
    let frame = 0;
    let lastSecond = -1;

    const renderClock = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const milliseconds = now.getMilliseconds();
      const minuteAngle = now.getMinutes() * 6 + seconds * 0.1 + milliseconds * 0.0001;

      rotateHand(minuteHandRef.current, minuteAngle);

      if (activeHourRef.current === null) {
        const secondAngle = seconds * 6 + milliseconds * 0.006;
        rotateHand(secondHandRef.current, secondAngle);
      }

      const actualAngle =
        (now.getHours() % 12) * 30 + now.getMinutes() * 0.5 + seconds / 120;
      rotateHand(hourHandRef.current, actualAngle);

      if (seconds !== lastSecond && digitalRef.current) {
        lastSecond = seconds;
        digitalRef.current.dateTime = now.toISOString();
        digitalRef.current.textContent = new Intl.DateTimeFormat("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
      }

      frame = requestAnimationFrame(renderClock);
    };

    frame = requestAnimationFrame(renderClock);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="clock-shell" aria-label={activeHour ? `Active task at ${activeHour}'o` : "Current time"}>
      <svg className="analog-clock" viewBox="0 0 360 360" role="img" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => {
          const angle = index * 45;
          return (
            <line
              className="clock-tick"
              key={angle}
              x1="180"
              y1="48"
              x2="180"
              y2="70"
              transform={`rotate(${angle} 180 180)`}
            />
          );
        })}
        <rect className="clock-center-block" x="155" y="155" width="50" height="50" />
        <line
          ref={hourHandRef}
          className="clock-hand clock-hand--hour"
          x1="180"
          y1="194"
          x2="180"
          y2="78"
        />
        <line
          ref={minuteHandRef}
          className="clock-hand clock-hand--minute"
          x1="180"
          y1="199"
          x2="180"
          y2="15"
        />
        <line
          ref={secondHandRef}
          className={`clock-hand clock-hand--second ${activeHour !== null ? "clock-hand--task" : ""}`}
          x1="180"
          y1="197"
          x2="180"
          y2="2"
        />
        <circle className="clock-pin" cx="180" cy="180" r="5" />
      </svg>
      <time ref={digitalRef} className="sr-only" aria-live="off" />
    </div>
  );
}
