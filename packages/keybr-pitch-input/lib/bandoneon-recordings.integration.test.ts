import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createPitchPipelineFromOptions,
  DEFAULT_OFFLINE_HOP_SIZE,
  replayOffline,
} from "@keybr/pitch-detection";
import { readWavFilePcm16MonoOrThrow } from "@keybr/pitch-detection/lib/wav-mono.ts";
import { deepEqual } from "rich-assert";
import { PitchInputAdapter } from "./adapter.ts";

/**
 * Every bandoneon MIDI note across left + right hand layouts. Matches the
 * set used by `MusicController` (via `bandoneon*Opening/Closing.keymap`).
 */
const BANDONEON_ALL_VALID_MIDI = new Set<number>([
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 95,
]);

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

/**
 * A B C D E D C B A G# A at four different roots (crosses the ledger at C).
 * Ground truth from the recording, not synthetic audio.
 */
const PARTIAL_MINOR_EXPECTED: Readonly<Record<string, readonly number[]>> = {
  "a2 partial minor scale.wav": [45, 47, 48, 50, 52, 50, 48, 47, 45, 44, 45],
  "a3 partial minor scale.wav": [57, 59, 60, 62, 64, 62, 60, 59, 57, 56, 57],
  "a4 partial minor scale.wav": [69, 71, 72, 74, 76, 74, 72, 71, 69, 68, 69],
  "a5 partial minor scale.wav": [81, 83, 84, 86, 88, 86, 84, 83, 81, 80, 81],
};

/**
 * Replays a recording through the exact same pipeline `MusicController`
 * assembles in production: `PitchPipeline` -> `PitchInputAdapter` -> IInputEvent.
 */
function practicePipelineMidiSequence(wavRelativeName: string): number[] {
  const path = join(FIXTURE_DIR, wavRelativeName);
  const { sampleRate, channel } = readWavFilePcm16MonoOrThrow(path);

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

  const codePoints: number[] = [];
  const adapter = new PitchInputAdapter(
    (event) => {
      if (event.inputType === "appendChar") {
        codePoints.push(event.codePoint);
      }
    },
    { validMidiNotes: BANDONEON_ALL_VALID_MIDI },
  );
  for (const e of events) {
    adapter.onPitch(e);
  }
  adapter.flush();
  return codePoints;
}

for (const name of Object.keys(PARTIAL_MINOR_EXPECTED)) {
  test(`practice pipeline: ${name} matches A B C D E D C B A G# A`, () => {
    const got = practicePipelineMidiSequence(name);
    deepEqual(got, [...PARTIAL_MINOR_EXPECTED[name]!]);
  });
}
