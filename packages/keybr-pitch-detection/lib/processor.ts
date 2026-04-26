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
  /**
   * RMS envelope release threshold: amplitude must dip to (peak * this ratio)
   * to arm release. A reed instrument's note attack/decay envelope spends most
   * of its time well above this fraction; a real release between repeated notes
   * dips below it.
   */
  readonly envelopeReleaseRatio?: number;
  /**
   * RMS envelope re-attack threshold: amplitude must rise to (trough * this
   * ratio) — and above an absolute floor — to confirm a fresh attack after
   * release. Higher values are stricter (fewer false re-attacks); lower values
   * are more sensitive.
   */
  readonly envelopeAttackRatio?: number;
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
const DEFAULT_ENV_RELEASE_RATIO = 0.5;
const DEFAULT_ENV_ATTACK_RATIO = 2.0;
/**
 * Absolute RMS floor for a re-attack to be believable. Below this the signal
 * is indistinguishable from background noise, regardless of the trough/rise
 * ratio.
 */
const ENV_MIN_ATTACK_RMS = 0.02;
/**
 * After an envelope-driven re-attack signal, the next confident YIN frame
 * matching the previously-emitted note can short-circuit the window vote and
 * emit immediately, provided at least this many matching votes are present
 * in the window. Two frames is enough to filter single-frame YIN glitches
 * without delaying re-attacks the way the full `matchFrames` threshold does.
 */
const ENV_FAST_EMIT_MIN_VOTES = 2;
/**
 * Maximum allowed deviation, in semitones, between the current YIN frequency
 * and the previously-emitted note's nominal frequency for the fast-emit path
 * to fire. During note transitions YIN frequently rounds to the prior MIDI
 * for one frame even though the underlying frequency is drifting toward the
 * next semitone — emitting a re-attack of the prior note in that window is
 * a false positive. 0.35 semitones rejects late-transition frames without
 * being so tight that mild intonation drift on a sustained note trips it.
 */
const ENV_FAST_EMIT_MAX_SEMITONE_OFFSET = 0.35;

type PitchFrame = {
  readonly timeStamp: number;
} & YinPitch;

/**
 * Debounce per-frame YIN output into stable note events.
 *
 * Strategy: sliding window over the last N "confident" frames. Emit a note
 * when some MIDI note occurs at least `matchFrames` times in the last
 * `windowFrames` frames. Sustained notes are emitted only on the leading
 * edge.
 *
 * Two complementary release signals lift the "no re-emit while sustained"
 * gate so that repeated notes produce one event per re-attack:
 *   1. Window-vote release — `#lastEmittedMidi` loses majority support in
 *      the window. Catches releases where YIN itself drops the prior pitch
 *      (silent gaps, low confidence, or a different MIDI taking over).
 *   2. Envelope re-attack — the RMS amplitude shows a trough-then-rise
 *      pattern. Catches legato re-attacks where YIN keeps locking onto the
 *      old pitch through the brief amplitude dip; the only non-pitch signal
 *      that a fresh attack happened is the amplitude envelope. Triggers
 *      `fast-emit` directly, short-circuiting the window vote so a re-attack
 *      with only 2-3 clean YIN frames between transient octave glitches
 *      still produces an event.
 */
export class StablePitchProcessor {
  readonly #minConfidence: number;
  readonly #windowFrames: number;
  readonly #matchFrames: number;
  readonly #validMidiNotes: ReadonlySet<number> | null;
  readonly #envReleaseRatio: number;
  readonly #envAttackRatio: number;

  /** Ring buffer of the most recent MIDI votes. -1 means "no vote this frame". */
  #window: number[] = [];
  #lastEmittedMidi: number | null = null;
  /**
   * `true` when the window-vote majority for the previously emitted note has
   * eroded below `matchFrames`. Once released, the next time that note's
   * majority re-establishes the normal emit path emits a fresh event. The
   * envelope-driven re-attack path is independent — it goes through
   * `#envAttackPending` and the fast-emit branch, not through this flag.
   */
  #released: boolean = true;
  /**
   * Set when the envelope detector confirms a fresh attack. Cleared on any
   * emit. While set, a confident YIN frame that matches `#lastEmittedMidi`
   * can fast-emit without waiting for the full `matchFrames` window vote,
   * which is required because attacks of repeated notes often have only 2-3
   * clean YIN frames between octave-glitch transients.
   */
  #envAttackPending: boolean = false;
  /** Highest RMS observed since the start of the current note envelope. */
  #envPeak: number = 0;
  /** Lowest RMS observed since `#envPeak` was last reset. */
  #envTrough: number = Number.POSITIVE_INFINITY;
  /** `true` once the current envelope has dipped below `peak * releaseRatio`. */
  #envReleasePending: boolean = false;

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
    this.#envReleaseRatio =
      options.envelopeReleaseRatio ?? DEFAULT_ENV_RELEASE_RATIO;
    this.#envAttackRatio =
      options.envelopeAttackRatio ?? DEFAULT_ENV_ATTACK_RATIO;
  }

  reset() {
    this.#window.length = 0;
    this.#lastEmittedMidi = null;
    this.#released = true;
    this.#envAttackPending = false;
    this.#envPeak = 0;
    this.#envTrough = Number.POSITIVE_INFINITY;
    this.#envReleasePending = false;
  }

  next(frame: PitchFrame | null, rms?: number): StablePitchProcessorResult {
    // Envelope tracking always runs first so that even YIN-null frames (silent
    // gaps, low-confidence drop-outs) still update peak/trough — those gaps
    // are exactly what a release looks like in the amplitude domain.
    if (rms != null && Number.isFinite(rms)) {
      this.#updateEnvelope(rms);
    }

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

    // Window-vote release: the previously emitted note has lost majority
    // support in the window. Catches releases that the envelope detector
    // misses (e.g. a sudden YIN drop-out without a corresponding amplitude
    // dip).
    if (
      this.#lastEmittedMidi != null &&
      (counts.get(this.#lastEmittedMidi) ?? 0) < this.#matchFrames
    ) {
      this.#released = true;
    }

    // Fast emit: envelope just confirmed a fresh attack and the current
    // confident frame matches the previously emitted note. This is the
    // repeated-notes-played-legato case, where the window vote alone cannot
    // accumulate `matchFrames` clean votes between attack-transient octave
    // glitches. No `#released` check here — env-attack is its own permission
    // to re-emit, separate from the window-vote release flag.
    if (
      this.#envAttackPending &&
      this.#lastEmittedMidi != null &&
      midiNote === this.#lastEmittedMidi &&
      (counts.get(midiNote) ?? 0) >= ENV_FAST_EMIT_MIN_VOTES &&
      this.#frequencyMatchesLastEmitted(frame.frequency)
    ) {
      this.#emit(midiNote);
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

    this.#emit(bestMidi);
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

  #frequencyMatchesLastEmitted(frequency: number): boolean {
    if (this.#lastEmittedMidi == null) {
      return false;
    }
    const nominal = 440 * Math.pow(2, (this.#lastEmittedMidi - 69) / 12);
    const semitoneOffset = 12 * Math.log2(frequency / nominal);
    return Math.abs(semitoneOffset) <= ENV_FAST_EMIT_MAX_SEMITONE_OFFSET;
  }

  #emit(midiNote: number) {
    this.#lastEmittedMidi = midiNote;
    this.#released = false;
    this.#envAttackPending = false;
    // Refill the window with the just-emitted note. Without this the window
    // can still contain pre-emit octave-glitch / null frames; the next frame
    // would see `counts.get(midi) < matchFrames` and immediately flip
    // `#released` back to true, which produces a spurious second emit a few
    // frames later when the window naturally fills.
    this.#window.length = 0;
    for (let i = 0; i < this.#windowFrames; i += 1) {
      this.#window.push(midiNote);
    }
  }

  #updateEnvelope(rms: number) {
    if (rms > this.#envPeak) {
      this.#envPeak = rms;
      this.#envTrough = rms;
      this.#envReleasePending = false;
      return;
    }
    if (rms < this.#envTrough) {
      this.#envTrough = rms;
    }
    if (
      !this.#envReleasePending &&
      this.#envPeak > 0 &&
      rms < this.#envPeak * this.#envReleaseRatio
    ) {
      this.#envReleasePending = true;
    }
    if (
      this.#envReleasePending &&
      rms > this.#envTrough * this.#envAttackRatio &&
      rms > ENV_MIN_ATTACK_RMS
    ) {
      // Fresh attack confirmed. We deliberately do NOT set `#released = true`
      // here — that would let the normal-emit path spuriously re-emit
      // `lastEmittedMidi` whenever the window still contains its votes (which
      // it always does for a few frames at every attack). The envelope signal
      // is consumed only by the fast-emit path, which already requires the
      // current confident frame to match `lastEmittedMidi`.
      this.#envAttackPending = true;
      this.#envPeak = rms;
      this.#envTrough = rms;
      this.#envReleasePending = false;
    }
  }

  #pushVote(v: number) {
    this.#window.push(v);
    if (this.#window.length > this.#windowFrames) {
      this.#window.shift();
    }
  }
}
