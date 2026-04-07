import { frequencyToMidiNote } from "./midi.ts";
import { type PitchEvent } from "./types.ts";
import { type YinPitch } from "./yin.ts";

export type StablePitchProcessorResult = {
  readonly event: PitchEvent | null;
  readonly processorRejected: null | "low_confidence" | "invalid_note";
  readonly stabilizing: null | {
    readonly midiNote: number;
    readonly frames: number;
    readonly requiredFrames: number;
  };
};

export type StablePitchProcessorOptions = {
  readonly minConfidence?: number;
  readonly stableFrames?: number;
  readonly validMidiNotes?: Iterable<number>;
};

const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_STABLE_FRAMES = 2;

type PitchFrame = {
  readonly timeStamp: number;
} & YinPitch;

export class StablePitchProcessor {
  readonly #minConfidence: number;
  readonly #stableFrames: number;
  readonly #validMidiNotes: ReadonlySet<number> | null;
  #pendingMidiNote: number | null = null;
  #pendingFrames = 0;

  constructor(options: StablePitchProcessorOptions = {}) {
    this.#minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.#stableFrames = Math.max(
      1,
      options.stableFrames ?? DEFAULT_STABLE_FRAMES,
    );
    this.#validMidiNotes =
      options.validMidiNotes != null ? new Set(options.validMidiNotes) : null;
  }

  reset() {
    this.#pendingMidiNote = null;
    this.#pendingFrames = 0;
  }

  next(frame: PitchFrame | null): StablePitchProcessorResult {
    if (frame == null) {
      this.reset();
      return { event: null, processorRejected: null, stabilizing: null };
    }

    if (
      frame.confidence < this.#minConfidence ||
      !Number.isFinite(frame.frequency) ||
      frame.frequency <= 0
    ) {
      this.reset();
      return {
        event: null,
        processorRejected: "low_confidence",
        stabilizing: null,
      };
    }

    const midiNote = frequencyToMidiNote(frame.frequency);
    if (this.#validMidiNotes != null && !this.#validMidiNotes.has(midiNote)) {
      this.reset();
      return {
        event: null,
        processorRejected: "invalid_note",
        stabilizing: null,
      };
    }

    if (this.#pendingMidiNote === midiNote) {
      this.#pendingFrames += 1;
    } else {
      this.#pendingMidiNote = midiNote;
      this.#pendingFrames = 1;
    }

    if (this.#pendingFrames < this.#stableFrames) {
      return {
        event: null,
        processorRejected: null,
        stabilizing: {
          midiNote,
          frames: this.#pendingFrames,
          requiredFrames: this.#stableFrames,
        },
      };
    }

    return {
      event: {
        timeStamp: frame.timeStamp,
        midiNote,
        frequency: frame.frequency,
        confidence: frame.confidence,
      },
      processorRejected: null,
      stabilizing: null,
    };
  }
}
