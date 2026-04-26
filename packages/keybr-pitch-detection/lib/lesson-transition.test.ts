import { test } from "node:test";
import { deepEqual } from "rich-assert";
import {
  createPitchPipelineFromOptions,
  DEFAULT_OFFLINE_HOP_SIZE,
  replayOffline,
} from "./pipeline.ts";
import { type PitchEvent } from "./types.ts";

/**
 * BEN-53 — concrete, end-to-end pipeline evidence that calling
 * `pipeline.reset()` at a music-lesson boundary unblocks the first note of
 * the next lesson when it shares its MIDI with the last emitted note of the
 * previous lesson.
 *
 * The test feeds a synthesized A4 sine wave through one shared pipeline,
 * splitting the playback at a "lesson boundary" where the new lesson's first
 * note is the same pitch as the previous lesson's last note. This reproduces
 * the live-app failure mode (see `MusicController.tsx` — same instrument
 * keymap → reused `PitchInputHandler` → reused processor with stale
 * `#lastEmittedMidi` and `!#released`).
 *
 * Without the boundary `reset()`, the processor's `bestMidi ===
 * #lastEmittedMidi && !#released` gate at `processor.ts` swallows the second
 * "lesson"'s sustained-note emit; with `reset()`, both lessons emit one A4.
 */
const SAMPLE_RATE = 44_100;
const BUFFER_SIZE = 2048;
const A4_MIDI = 69;
const A4_FREQ = 440;
const SUSTAIN_SAMPLES = SAMPLE_RATE; // 1 second

const DETECTOR_OPTIONS = {
  bufferSize: BUFFER_SIZE,
  minFrequency: 50,
  maxFrequency: 2000,
  yinThreshold: 0.12,
  minConfidence: 0.7,
  windowFrames: 6,
  matchFrames: 4,
} as const;

function sine(frequency: number, samples: number): Float32Array {
  const buf = new Float32Array(samples);
  const omega = (2 * Math.PI * frequency) / SAMPLE_RATE;
  for (let i = 0; i < samples; i += 1) {
    buf[i] = 0.5 * Math.sin(omega * i);
  }
  return buf;
}

function midiSequence(events: readonly PitchEvent[]): number[] {
  return events.map((e) => e.midiNote);
}

test("lesson transition: without reset() the same-MIDI follow-up note is suppressed", () => {
  const pipeline = createPitchPipelineFromOptions(DETECTOR_OPTIONS);
  const lessonOne = replayOffline(
    pipeline,
    sine(A4_FREQ, SUSTAIN_SAMPLES),
    SAMPLE_RATE,
    DEFAULT_OFFLINE_HOP_SIZE,
  );
  const lessonTwo = replayOffline(
    pipeline,
    sine(A4_FREQ, SUSTAIN_SAMPLES),
    SAMPLE_RATE,
    DEFAULT_OFFLINE_HOP_SIZE,
  );
  // BUG: lesson 2's continuation of A4 is dropped — the processor still has
  // `#lastEmittedMidi == 69 && !#released` from lesson 1's emit, and the
  // sustained sine never causes a release. This is the failure the user
  // reported: "the first note of the next set of notes [doesn't] register".
  deepEqual(midiSequence(lessonOne), [A4_MIDI]);
  deepEqual(midiSequence(lessonTwo), []);
});

test("lesson transition: pipeline.reset() at the boundary lets the next lesson's first note fire", () => {
  const pipeline = createPitchPipelineFromOptions(DETECTOR_OPTIONS);
  const lessonOne = replayOffline(
    pipeline,
    sine(A4_FREQ, SUSTAIN_SAMPLES),
    SAMPLE_RATE,
    DEFAULT_OFFLINE_HOP_SIZE,
  );
  // Simulated music-lesson transition. `MusicController` calls
  // `handler.reset()` here (-> detector.reset() -> pipeline.reset()).
  pipeline.reset();
  const lessonTwo = replayOffline(
    pipeline,
    sine(A4_FREQ, SUSTAIN_SAMPLES),
    SAMPLE_RATE,
    DEFAULT_OFFLINE_HOP_SIZE,
  );
  deepEqual(midiSequence(lessonOne), [A4_MIDI]);
  deepEqual(
    midiSequence(lessonTwo),
    [A4_MIDI],
    `with reset(): lesson 2 must emit a fresh A4 on its first stable frame group`,
  );
});
