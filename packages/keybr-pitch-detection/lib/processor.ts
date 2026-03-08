import { frequencyToMidiNote } from "./midi.ts";
import { type PitchEvent } from "./types.ts";
import { type YinPitch } from "./yin.ts";

export type StablePitchProcessorOptions = {
  readonly minConfidence?: number;
  readonly stableFrames?: number;
};

const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_STABLE_FRAMES = 2;

type PitchFrame = {
  readonly timeStamp: number;
} & YinPitch;

export class StablePitchProcessor {
  readonly #minConfidence: number;
  readonly #stableFrames: number;
  #pendingMidiNote: number | null = null;
  #pendingFrames = 0;

  constructor(options: StablePitchProcessorOptions = {}) {
    this.#minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.#stableFrames = Math.max(
      1,
      options.stableFrames ?? DEFAULT_STABLE_FRAMES,
    );
  }

  reset() {
    this.#pendingMidiNote = null;
    this.#pendingFrames = 0;
  }

  next(frame: PitchFrame | null): PitchEvent | null {
    if (
      frame == null ||
      frame.confidence < this.#minConfidence ||
      !Number.isFinite(frame.frequency) ||
      frame.frequency <= 0
    ) {
      this.reset();
      return null;
    }

    const midiNote = frequencyToMidiNote(frame.frequency);
    if (this.#pendingMidiNote === midiNote) {
      this.#pendingFrames += 1;
    } else {
      this.#pendingMidiNote = midiNote;
      this.#pendingFrames = 1;
    }

    if (this.#pendingFrames < this.#stableFrames) {
      return null;
    }

    return {
      timeStamp: frame.timeStamp,
      midiNote,
      frequency: frame.frequency,
      confidence: frame.confidence,
    };
  }
}
