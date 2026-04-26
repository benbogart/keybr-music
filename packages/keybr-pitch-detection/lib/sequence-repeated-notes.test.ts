import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deepEqual } from "rich-assert";
import {
  createPitchPipelineFromOptions,
  DEFAULT_OFFLINE_HOP_SIZE,
  replayOffline,
} from "./pipeline.ts";
import { readWavFilePcm16MonoOrThrow } from "./wav-mono.ts";

/**
 * Each repeated note must produce its own emitted event — collapsing on
 * `midiNote` would hide regressions in repeated-note handling, so these tests
 * assert the raw emitted MIDI sequence.
 *
 * The recordings live in `tests/pitch/bandoneon-recordings/` and are real
 * bandoneon takes from the same player on the same instrument; together they
 * cover the two failure modes seen on master:
 *   - "repeated notes.wav" — staccato re-attacks with brief silences between
 *     them; previously suppressed because the processor treated the second
 *     attack as a continuation of the first emitted note.
 *   - "repeated notes 2.wav" — legato re-attacks where YIN keeps locking
 *     onto the same pitch through the brief amplitude dip between attacks;
 *     previously suppressed because the sliding-window vote alone never
 *     loses `matchFrames` support for the previous note. The envelope-driven
 *     re-attack detector in `StablePitchProcessor` is what makes this case
 *     emit a fresh event.
 */
const CASES = [
  {
    filename: "repeated notes.wav",
    /** a3, g#3, a3, a3, b3, b3, b3, c4, c4, c4, c4, b3 */
    expected: [57, 56, 57, 57, 59, 59, 59, 60, 60, 60, 60, 59],
  },
  {
    filename: "repeated notes 2.wav",
    /** g#4 ×4, a4 ×4, b4 ×4, c5 ×4 */
    expected: [68, 68, 68, 68, 69, 69, 69, 69, 71, 71, 71, 71, 72, 72, 72, 72],
  },
] as const;

const FIXTURE_DIR = fileURLToPath(
  new URL("../../../tests/pitch/bandoneon-recordings", import.meta.url),
);

const DETECTOR_OPTIONS = {
  minFrequency: 50,
  maxFrequency: 2000,
  yinThreshold: 0.12,
  minConfidence: 0.7,
  windowFrames: 6,
  matchFrames: 4,
} as const;

/** Same valid-note set used by `sequence-c-scale.test.ts`. */
const BANDONEON_ALL_VALID_MIDI = new Set<number>([
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 95,
]);

for (const { filename, expected } of CASES) {
  test(
    `repeated notes — real bandoneon recording "${filename}": each re-attack emits a fresh event`,
    { timeout: 120_000 },
    () => {
      const recPath = join(FIXTURE_DIR, filename);
      if (!existsSync(recPath)) {
        throw new Error(
          `Repeated-notes pitch test: missing recording at ${recPath}.`,
        );
      }
      const { sampleRate, channel } = readWavFilePcm16MonoOrThrow(recPath);

      const pipeline = createPitchPipelineFromOptions({
        ...DETECTOR_OPTIONS,
        validMidiNotes: BANDONEON_ALL_VALID_MIDI,
      });
      const events = replayOffline(
        pipeline,
        channel,
        sampleRate,
        DEFAULT_OFFLINE_HOP_SIZE,
      );
      const got = events.map((e) => e.midiNote);
      deepEqual(
        got,
        [...expected] as number[],
        `got [${got.join(",")}] expected [${[...expected].join(",")}]`,
      );
    },
  );
}
