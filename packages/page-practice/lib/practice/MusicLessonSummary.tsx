import { useIntlNumbers } from "@keybr/intl";
import { type ReactNode } from "react";
import * as styles from "./MusicLessonSummary.module.less";
import { type MusicLessonSummary } from "./state/index.ts";

export function MusicLessonSummaryPanel({
  summary,
  targetSpeed,
}: {
  readonly summary: MusicLessonSummary;
  readonly targetSpeed: number;
}): ReactNode {
  const { formatNumber, formatPercents } = useIntlNumbers();
  return (
    <section className={styles.root} data-testid="music-lesson-summary">
      <h3 className={styles.title}>Lesson summary</h3>
      <div className={styles.metrics}>
        <Metric name="Notes played" value={formatNumber(summary.notesPlayed)} />
        <Metric
          name="Accuracy"
          value={formatPercents(summary.accuracy)}
          strong={summary.accuracy < 0.9}
        />
        <Metric
          name="Notes per minute"
          value={formatNumber(summary.notesPerMinute)}
        />
        <Metric name="Slowest note" value={summary.slowestNote ?? "N/A"} />
      </div>
      <div className={styles.header}>
        <span>Note</span>
        <span>Status</span>
        <span>Speed vs target</span>
        <span>Accuracy</span>
      </div>
      <div className={styles.notes}>
        {summary.notes.map((note) => {
          const speed = note.speed != null ? Math.round(note.speed) : null;
          const speedWidth =
            speed != null && targetSpeed > 0
              ? Math.max(2, Math.min(100, (speed / targetSpeed) * 100))
              : 0;
          return (
            <div key={note.codePoint} className={styles.row}>
              <span className={styles.label}>
                {note.label}
                {note.isSlowest && <em className={styles.badge}>slowest</em>}
              </span>
              <span className={styles.status}>
                {note.inLesson ? "In lesson" : "Locked"}
              </span>
              <span className={styles.speed}>
                {note.inLesson && speed != null ? (
                  <>
                    <span className={styles.bar}>
                      <span
                        className={
                          note.atTargetSpeed ? styles.bar_fast : styles.bar_slow
                        }
                        style={{ width: `${speedWidth}%` }}
                      />
                    </span>
                    <span className={styles.speedValue}>
                      {formatNumber(speed)}
                    </span>
                  </>
                ) : (
                  <span className={styles.empty}>-</span>
                )}
              </span>
              <span className={styles.accuracy}>
                {note.accuracy != null ? formatPercents(note.accuracy) : "-"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Metric({
  name,
  value,
  strong = false,
}: {
  readonly name: string;
  readonly value: string;
  readonly strong?: boolean;
}) {
  return (
    <span className={styles.metric}>
      <span className={styles.metricName}>{name}</span>
      <span className={strong ? styles.metricValue_strong : styles.metricValue}>
        {value}
      </span>
    </span>
  );
}
