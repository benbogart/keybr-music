import { type LessonKeys } from "@keybr/lesson";
import { type Result, timeToSpeed } from "@keybr/result";

const SPACE_CODE_POINT = 0x0020;

export type MusicLessonSummaryNote = {
  readonly codePoint: number;
  readonly label: string;
  readonly inLesson: boolean;
  readonly speed: number | null;
  readonly accuracy: number | null;
  readonly atTargetSpeed: boolean;
  readonly isSlowest: boolean;
};

export type MusicLessonSummary = {
  readonly notesPlayed: number;
  readonly notesPerMinute: number;
  readonly accuracy: number;
  readonly slowestNote: string | null;
  readonly notes: readonly MusicLessonSummaryNote[];
};

export function makeMusicLessonSummary(
  result: Result,
  lessonKeys: LessonKeys,
  targetSpeed: number,
): MusicLessonSummary {
  const samples = new Map(
    [...result.histogram].map((sample) => [sample.codePoint, sample]),
  );
  let notesPlayed = 0;
  let slowestCodePoint: number | null = null;
  let slowestTimeToType = -1;

  const notes = [...lessonKeys].map((lessonKey) => {
    const {
      letter: { codePoint, label },
      isIncluded,
    } = lessonKey;
    const sample = samples.get(codePoint) ?? null;
    const hitCount = sample?.hitCount ?? 0;
    const missCount = sample?.missCount ?? 0;
    const typedNotes = codePoint !== SPACE_CODE_POINT ? hitCount : 0;
    notesPlayed += typedNotes;

    const speed =
      sample != null && sample.timeToType > 0
        ? timeToSpeed(sample.timeToType)
        : null;

    if (
      codePoint !== SPACE_CODE_POINT &&
      sample != null &&
      sample.timeToType > slowestTimeToType
    ) {
      slowestCodePoint = codePoint;
      slowestTimeToType = sample.timeToType;
    }

    const errors = Math.min(missCount, hitCount);
    const accuracy =
      hitCount > 0 ? Math.max(0, (hitCount - errors) / hitCount) : null;

    return {
      codePoint,
      label,
      inLesson: isIncluded,
      speed,
      accuracy,
      atTargetSpeed: speed != null && speed >= targetSpeed,
      isSlowest: false,
    } satisfies MusicLessonSummaryNote;
  });

  return {
    notesPlayed,
    notesPerMinute: Math.round(result.speed),
    accuracy: result.accuracy,
    slowestNote:
      slowestCodePoint != null
        ? (notes.find((note) => note.codePoint === slowestCodePoint)?.label ??
          null)
        : null,
    notes: notes.map((note) => ({
      ...note,
      isSlowest: note.codePoint === slowestCodePoint,
    })),
  };
}
