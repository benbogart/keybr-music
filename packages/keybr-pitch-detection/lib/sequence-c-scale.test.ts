import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deepEqual, isTrue } from "rich-assert";
import {
  collapseConsecutiveMidiNotes,
  createPitchPipelineFromOptions,
  DEFAULT_OFFLINE_HOP_SIZE,
  replayOffline,
} from "./pipeline.ts";
import { readWavFilePcm16MonoOrThrow } from "./wav-mono.ts";

/**
 * Ground truth: C2, C3, C4, C5, C6, C5, C4, C3, C2 (first three left hand,
 * the rest on the right). The test replays the WAV under
 * `tests/pitch/bandoneon-recordings/` (see `REPO_PITCH_FILENAMES`) and asserts
 * the **detected** sequence matches.
 */
const C_OCTAVES_MIDI = [36, 48, 60, 72, 84, 72, 60, 48, 36] as const;

const SAMPLE_RATE = 44_100;
const DETECTOR_OPTIONS = {
  minFrequency: 50,
  maxFrequency: 2000,
  yinThreshold: 0.12,
  minConfidence: 0.7,
  windowFrames: 6,
  matchFrames: 4,
} as const;

/** Preferred first (user rename); legacy second. */
const REPO_PITCH_FILENAMES = [
  "c2-c6 octaves.wav",
  "c-scale-cascade-lh-rh.wav",
] as const;

const REPO_PITCH_DIR = fileURLToPath(
  new URL("../../../tests/pitch/bandoneon-recordings", import.meta.url),
);
const PACKAGE_PITCH_DIR = fileURLToPath(
  new URL("../test-fixtures", import.meta.url),
);

const PITCH_TEST_WAV = process.env.PITCH_TEST_WAV;

function resolveCOctavesRecordingPath(): string {
  for (const name of REPO_PITCH_FILENAMES) {
    const p = join(REPO_PITCH_DIR, name);
    if (existsSync(p)) {
      return p;
    }
  }
  for (const name of REPO_PITCH_FILENAMES) {
    const p = join(PACKAGE_PITCH_DIR, name);
    if (existsSync(p)) {
      return p;
    }
  }
  if (PITCH_TEST_WAV != null && PITCH_TEST_WAV.length > 0) {
    if (!existsSync(PITCH_TEST_WAV)) {
      throw new Error(
        `PITCH_TEST_WAV is set to "${PITCH_TEST_WAV}" but that path does not exist`,
      );
    }
    return PITCH_TEST_WAV;
  }
  throw new Error(
    `C octaves pitch test: missing real recording. Add 16-bit PCM to ${REPO_PITCH_DIR}/ as "${REPO_PITCH_FILENAMES[0]}" (or legacy "${REPO_PITCH_FILENAMES[1]}"), or under packages/keybr-pitch-detection/test-fixtures/, or set PITCH_TEST_WAV. Content: C2, C3, C4, C5, C6, C5, C4, C3, C2.`,
  );
}

/** Union of all MIDI notes on left + right bandoneon layouts (see `bandoneon-layout.ts`). */
const BANDONEON_ALL_VALID_MIDI = new Set<number>([
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
  93, 95,
]);

test("C octaves — synthetic regression: harmonic-rich windows produce expected collapsed MIDI", () => {
  const nWindows = C_OCTAVES_MIDI.length;
  const perWindow = 8000; // ~180 ms per note
  const total = nWindows * perWindow;
  const channel = new Float32Array(total);
  for (let w = 0; w < nWindows; w += 1) {
    const midi = C_OCTAVES_MIDI[w]!;
    const f = 440 * 2 ** ((midi - 69) / 12);
    const base = w * perWindow;
    for (let i = 0; i < perWindow; i += 1) {
      const t = (2 * Math.PI * f * (base + i)) / SAMPLE_RATE;
      channel[base + i] =
        0.2 * Math.sin(t) + 0.5 * Math.sin(2 * t) + 0.35 * Math.sin(3 * t);
    }
  }

  const pipeline = createPitchPipelineFromOptions(
    { ...DETECTOR_OPTIONS, validMidiNotes: BANDONEON_ALL_VALID_MIDI },
    { noiseFloor: 0 },
  );
  const events = replayOffline(
    pipeline,
    channel,
    SAMPLE_RATE,
    DEFAULT_OFFLINE_HOP_SIZE,
  );

  const got = collapseConsecutiveMidiNotes(events);
  isTrue(got.length >= C_OCTAVES_MIDI.length, `got ${got.join(",")}`);
  for (let i = 0; i < C_OCTAVES_MIDI.length; i += 1) {
    deepEqual(got[i]!, C_OCTAVES_MIDI[i]!);
  }
});

test(
  "C octaves — real bandoneon recording: pipeline matches C2..C6..C2",
  { timeout: 120_000 },
  () => {
    const recPath = resolveCOctavesRecordingPath();
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
    const got = collapseConsecutiveMidiNotes(events);
    deepEqual(
      got,
      [...C_OCTAVES_MIDI] as number[],
      `got [${got.join(",")}] expected [${[...C_OCTAVES_MIDI].join(",")}]`,
    );
  },
);

test("collapseConsecutiveMidiNotes dedupes sustained same MIDI", () => {
  deepEqual(
    collapseConsecutiveMidiNotes([
      { midiNote: 60 },
      { midiNote: 60 },
      { midiNote: 60 },
      { midiNote: 64 },
    ]),
    [60, 64],
  );
});
