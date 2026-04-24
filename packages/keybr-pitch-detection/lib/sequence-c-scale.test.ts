import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deepEqual, isTrue } from "rich-assert";
import {
  collapseConsecutiveMidiNotes,
  defaultOfflineHopsFromDetectorOptions,
  simulateOfflinePitchHops,
} from "./pitch-offline-simulate.ts";
import { readWavFilePcm16MonoOrThrow } from "./wav-mono.ts";

/**
 * Ground truth: C2, C3, C4, C5, C6, C5, C4, C3, C2 (first three left hand,
 * the rest on the right). The test replays the WAV under
 * `tests/pitch/c-scale-cascade-lh-rh/` (see `REPO_PITCH_FILENAMES`) and asserts
 * the **detected** sequence matches.
 */
const C_SCALE_CASCADE_MIDI = [36, 48, 60, 72, 84, 72, 60, 48, 36] as const;

const SAMPLE_RATE = 44_100;
const PITCH_TEST_OPTIONS = {
  minFrequency: 50,
  maxFrequency: 2000,
  yinThreshold: 0.12,
  minConfidence: 0.7,
  stableFrames: 2,
} as const;
const HOP = 1024;
const WINDOW = 2048;

/** Preferred first (user rename); legacy second. */
const REPO_PITCH_FILENAMES = [
  "c2-c6 octaves.wav",
  "c-scale-cascade-lh-rh.wav",
] as const;

const REPO_PITCH_DIR = fileURLToPath(
  new URL("../../../tests/pitch/c-scale-cascade-lh-rh", import.meta.url),
);
const PACKAGE_PITCH_DIR = fileURLToPath(
  new URL("../test-fixtures", import.meta.url),
);

const PITCH_TEST_WAV = process.env.PITCH_TEST_WAV;

function resolveCScaleRecordingPath(): string {
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

test("C cascade — synthetic regression: harmonic-rich windows produce expected collapsed MIDI (offline sim)", () => {
  // Short harmonic-rich windows per "note" so the pipeline emits each step once
  // after consecutive collapse (mirrors a clean synthetic benchmark).
  const nWindows = C_SCALE_CASCADE_MIDI.length;
  const perWindow = 4000; // 4k samples ≈ 90 ms
  const total = nWindows * perWindow;
  const channel = new Float32Array(total);
  for (let w = 0; w < nWindows; w += 1) {
    const midi = C_SCALE_CASCADE_MIDI[w]!;
    const f = 440 * 2 ** ((midi - 69) / 12);
    const base = w * perWindow;
    for (let i = 0; i < perWindow; i += 1) {
      const t = (2 * Math.PI * f * (base + i)) / SAMPLE_RATE;
      // Same recipe as yin.test harmonic-rich: avoid pure sine to exercise descent.
      channel[base + i] =
        0.2 * Math.sin(t) + 0.5 * Math.sin(2 * t) + 0.35 * Math.sin(3 * t);
    }
  }

  const { bufferSize, hopSize, yin, stable } =
    defaultOfflineHopsFromDetectorOptions({
      ...PITCH_TEST_OPTIONS,
      validMidiNotes: BANDONEON_ALL_VALID_MIDI,
      bufferSize: WINDOW,
      hopSize: HOP,
    });

  const events = simulateOfflinePitchHops(channel, SAMPLE_RATE, {
    bufferSize,
    hopSize,
    yin,
    stable,
    noiseFloor: 0,
    timeStampForOffset: (o) => (o / SAMPLE_RATE) * 1000,
  });

  const got = collapseConsecutiveMidiNotes(events);
  isTrue(got.length >= C_SCALE_CASCADE_MIDI.length, String(got));
  for (let i = 0; i < C_SCALE_CASCADE_MIDI.length; i += 1) {
    deepEqual(got[i]!, C_SCALE_CASCADE_MIDI[i]!);
  }
});

test(
  "C octaves — real bandoneon recording: offline YIN+processor matches c2..c6..c2 (collapse consecutive)",
  { timeout: 120_000 },
  () => {
    const recPath = resolveCScaleRecordingPath();
    const { sampleRate, channel } = readWavFilePcm16MonoOrThrow(recPath);

    const { bufferSize, hopSize, yin, stable } =
      defaultOfflineHopsFromDetectorOptions({
        ...PITCH_TEST_OPTIONS,
        validMidiNotes: BANDONEON_ALL_VALID_MIDI,
        bufferSize: WINDOW,
        hopSize: HOP,
      });

    const events = simulateOfflinePitchHops(channel, sampleRate, {
      bufferSize,
      hopSize,
      yin,
      stable,
      noiseFloor: 0.01,
      timeStampForOffset: (o) => (o / sampleRate) * 1000,
    });
    const got = collapseConsecutiveMidiNotes(events);
    isTrue(
      got.length === C_SCALE_CASCADE_MIDI.length,
      `got [${got.join(",")}] (${got.length} steps) expected ${
        C_SCALE_CASCADE_MIDI.length
      } steps [${[...C_SCALE_CASCADE_MIDI].join(",")}]`,
    );
    deepEqual(got, [...C_SCALE_CASCADE_MIDI] as number[]);
  },
);

test("match helper: collapseConsecutive dedupes sustained same MIDI", () => {
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
