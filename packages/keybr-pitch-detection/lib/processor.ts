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
  /** Minimum YIN confidence (0..1) required for a frame to be counted in the window. */
  readonly minConfidence?: number;
  /**
   * Sliding-window size, in frames, used for majority vote.
   *
   * Each analysis frame is ~23 ms at 44.1 kHz with a 1024-sample hop, so
   * a window of 6 frames covers ~140 ms — long enough to smooth over attack
   * transients (where harmonics briefly dominate and push YIN an octave up)
   * without making cheap sustained notes feel laggy.
   */
  readonly windowFrames?: number;
  /**
   * Minimum matching votes, within the window, required before emitting a note.
   * `matchFrames` of `windowFrames` must agree on the same MIDI.
   *
   * Old API: `stableFrames` meant "N in a row". It did not survive one-off
   * octave-jump frames during note attacks. Sliding window + majority vote
   * handles that case without being note-specific.
   */
  readonly matchFrames?: number;
  /** Only emit when the detected MIDI is in this set. */
  readonly validMidiNotes?: Iterable<number>;
};

/**
 * @deprecated Alias. New code should use `windowFrames` + `matchFrames`.
 * Kept only so call sites that still pass `stableFrames` keep compiling.
 */
export type LegacyStablePitchProcessorOptions = StablePitchProcessorOptions & {
  readonly stableFrames?: number;
};

const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_WINDOW_FRAMES = 6;
const DEFAULT_MATCH_FRAMES = 4;

type PitchFrame = {
  readonly timeStamp: number;
} & YinPitch;

/**
 * Debounce per-frame YIN output into stable note events.
 *
 * Strategy: sliding window over the last N "confident" frames. Emit a note
 * when some MIDI note occurs at least `matchFrames` times in the last
 * `windowFrames` frames. Sustained notes are emitted only on the leading
 * edge: while a note keeps winning the majority vote without ever losing
 * `matchFrames` support in the window, no further events fire. Once the
 * window loses that support (e.g. a release between repeated notes), the
 * note is considered "released" and the next majority — even for the
 * exact same MIDI — emits a new event.
 */
export class StablePitchProcessor {
  readonly #minConfidence: number;
  readonly #windowFrames: number;
  readonly #matchFrames: number;
  readonly #validMidiNotes: ReadonlySet<number> | null;

  /** Ring buffer of the most recent MIDI votes. -1 means "no vote this frame". */
  #window: number[] = [];
  #lastEmittedMidi: number | null = null;
  /**
   * `true` when the previously emitted note has been "released" — i.e. the
   * recent window no longer contains enough votes for `#lastEmittedMidi` to
   * keep emitting it as sustained. Once released, the next time that same
   * note re-attacks and accumulates a fresh majority it is emitted again,
   * which is what makes repeated notes detectable.
   */
  #released: boolean = true;

  constructor(options: LegacyStablePitchProcessorOptions = {}) {
    this.#minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    const win =
      options.windowFrames ??
      /* legacy compat */ (options.stableFrames != null
        ? Math.max(DEFAULT_WINDOW_FRAMES, options.stableFrames * 2)
        : DEFAULT_WINDOW_FRAMES);
    this.#windowFrames = Math.max(1, win);
    this.#matchFrames = Math.max(
      1,
      Math.min(this.#windowFrames, options.matchFrames ?? DEFAULT_MATCH_FRAMES),
    );
    this.#validMidiNotes =
      options.validMidiNotes != null ? new Set(options.validMidiNotes) : null;
  }

  reset() {
    this.#window.length = 0;
    this.#lastEmittedMidi = null;
    this.#released = true;
  }

  next(frame: PitchFrame | null): StablePitchProcessorResult {
    if (frame == null) {
      this.#pushVote(-1);
      return { event: null, processorRejected: null, stabilizing: null };
    }

    if (
      frame.confidence < this.#minConfidence ||
      !Number.isFinite(frame.frequency) ||
      frame.frequency <= 0
    ) {
      this.#pushVote(-1);
      return {
        event: null,
        processorRejected: "low_confidence",
        stabilizing: null,
      };
    }

    const midiNote = frequencyToMidiNote(frame.frequency);

    // Hard gate: frames outside the instrument's note set never vote.
    if (this.#validMidiNotes != null && !this.#validMidiNotes.has(midiNote)) {
      this.#pushVote(-1);
      return {
        event: null,
        processorRejected: "invalid_note",
        stabilizing: null,
      };
    }

    this.#pushVote(midiNote);

    // Majority vote: pick the most frequent positive note in the window.
    let bestMidi = -1;
    let bestCount = 0;
    const counts = new Map<number, number>();
    for (const v of this.#window) {
      if (v <= 0) continue;
      const c = (counts.get(v) ?? 0) + 1;
      counts.set(v, c);
      if (c > bestCount) {
        bestCount = c;
        bestMidi = v;
      }
    }

    // Release detection: if the previously emitted note no longer has
    // matchFrames support in the window, treat the player as having let go
    // of it. This is what lets the next majority for the same note emit a
    // fresh event instead of being suppressed as "still the same note".
    if (
      this.#lastEmittedMidi != null &&
      (counts.get(this.#lastEmittedMidi) ?? 0) < this.#matchFrames
    ) {
      this.#released = true;
    }

    if (bestCount < this.#matchFrames) {
      return {
        event: null,
        processorRejected: null,
        stabilizing: {
          midiNote: bestMidi > 0 ? bestMidi : midiNote,
          frames: bestCount,
          requiredFrames: this.#matchFrames,
        },
      };
    }

    if (bestMidi === this.#lastEmittedMidi && !this.#released) {
      return {
        event: null,
        processorRejected: null,
        stabilizing: null,
      };
    }

    this.#lastEmittedMidi = bestMidi;
    this.#released = false;

    return {
      event: {
        timeStamp: frame.timeStamp,
        midiNote: bestMidi,
        frequency: frame.frequency,
        confidence: frame.confidence,
      },
      processorRejected: null,
      stabilizing: null,
    };
  }

  #pushVote(v: number) {
    this.#window.push(v);
    if (this.#window.length > this.#windowFrames) {
      this.#window.shift();
    }
  }
}
