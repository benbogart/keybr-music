import { type PitchEvent } from "@keybr/pitch-detection";
import { type IInputEvent } from "@keybr/textinput-events";

const DEFAULT_OCTAVE_CORRECTION_WINDOW_MS = 30;
const DEFAULT_SUSTAIN_GAP_MS = 80;
const OCTAVE = 12;

type PendingPitch = {
  readonly timeStamp: number;
  readonly midiNote: number;
};

function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const runtime = globalThis as {
    process?: { versions?: { node?: string } };
  };
  if (runtime.process?.versions?.node == null) {
    return;
  }
  void import("node:fs")
    .then(({ appendFileSync }) => {
      appendFileSync(
        "/opt/cursor/logs/debug.log",
        JSON.stringify({
          hypothesisId,
          location,
          message,
          data,
          timestamp: Date.now(),
        }) + "\n",
      );
    })
    .catch(() => {});
}

export type PitchInputAdapterOptions = {
  readonly octaveCorrectionWindowMs?: number;
  readonly sustainGapMs?: number;
  readonly validMidiNotes?: Iterable<number>;
};

export class PitchInputAdapter {
  readonly #onInput: (event: IInputEvent) => void;
  readonly #octaveCorrectionWindowMs: number;
  readonly #sustainGapMs: number;
  readonly #validMidiNotes: ReadonlySet<number> | null;

  #pending: PendingPitch | null = null;
  #lastSeen: PendingPitch | null = null;
  #lastInputTimeStamp: number | null = null;

  constructor(
    onInput: (event: IInputEvent) => void,
    options: PitchInputAdapterOptions = {},
  ) {
    this.#onInput = onInput;
    this.#octaveCorrectionWindowMs =
      options.octaveCorrectionWindowMs ?? DEFAULT_OCTAVE_CORRECTION_WINDOW_MS;
    this.#sustainGapMs = options.sustainGapMs ?? DEFAULT_SUSTAIN_GAP_MS;
    this.#validMidiNotes =
      options.validMidiNotes != null ? new Set(options.validMidiNotes) : null;
  }

  onPitch = (event: PitchEvent) => {
    this.#flushExpired(event.timeStamp);
    if (
      this.#validMidiNotes != null &&
      !this.#validMidiNotes.has(event.midiNote)
    ) {
      // #region agent log
      agentDebugLog("C", "adapter.ts:67", "dropped invalid pitch", {
        midiNote: event.midiNote,
        pendingMidiNote: this.#pending?.midiNote ?? null,
        pendingAgeMs:
          this.#pending == null
            ? null
            : event.timeStamp - this.#pending.timeStamp,
      });
      // #endregion
      return;
    }

    const previous = this.#lastSeen;
    this.#lastSeen = toPendingPitch(event);
    if (
      previous != null &&
      previous.midiNote === event.midiNote &&
      event.timeStamp - previous.timeStamp <= this.#sustainGapMs
    ) {
      return;
    }

    const pending = this.#pending;
    if (pending == null) {
      this.#pending = toPendingPitch(event);
      return;
    }

    const delta = event.timeStamp - pending.timeStamp;
    if (
      delta <= this.#octaveCorrectionWindowMs &&
      event.midiNote === pending.midiNote - OCTAVE
    ) {
      this.#pending = toPendingPitch(event);
      return;
    }

    this.#emitPending();
    this.#pending = toPendingPitch(event);
  };

  flush() {
    this.#emitPending();
  }

  reset() {
    this.#pending = null;
    this.#lastSeen = null;
    this.#lastInputTimeStamp = null;
  }

  #flushExpired(timeStamp: number) {
    const pending = this.#pending;
    if (
      pending != null &&
      timeStamp - pending.timeStamp > this.#octaveCorrectionWindowMs
    ) {
      this.#emitPending();
    }
  }

  #emitPending() {
    const pending = this.#pending;
    if (pending == null) {
      return;
    }
    const event: IInputEvent = {
      type: "input",
      timeStamp: pending.timeStamp,
      inputType: "appendChar",
      codePoint: pending.midiNote,
      timeToType:
        this.#lastInputTimeStamp == null
          ? 0
          : pending.timeStamp - this.#lastInputTimeStamp,
    };
    // #region agent log
    agentDebugLog("C", "adapter.ts:144", "emit pending input", {
      codePoint: event.codePoint,
      timeStamp: event.timeStamp,
      timeToType: event.timeToType,
    });
    // #endregion
    this.#onInput(event);
    this.#lastInputTimeStamp = pending.timeStamp;
    this.#pending = null;
  }
}

function toPendingPitch(event: PitchEvent): PendingPitch {
  return {
    timeStamp: event.timeStamp,
    midiNote: event.midiNote,
  };
}
