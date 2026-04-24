import { type PitchEvent } from "@keybr/pitch-detection";
import { type IInputEvent } from "@keybr/textinput-events";

export type PitchInputAdapterOptions = {
  readonly validMidiNotes?: Iterable<number>;
};

/**
 * Bridges `PitchEvent`s from `PitchPipeline` into `IInputEvent`s consumed by
 * the TextInput pipeline.
 *
 * Historically this class also debounced octave transients and sustained-note
 * duplicates. That logic moved into `StablePitchProcessor`'s sliding-window
 * majority vote, which is the single source of truth for "this is a stable
 * new note" events. The adapter now:
 *
 * - drops notes outside `validMidiNotes` (defense in depth vs. processor)
 * - converts each incoming `PitchEvent` into one `IInputEvent` immediately,
 *   so UI indicators update on the note you just played, not on the next one.
 * - tracks the previous emit timestamp for `timeToType`.
 */
export class PitchInputAdapter {
  readonly #onInput: (event: IInputEvent) => void;
  readonly #validMidiNotes: ReadonlySet<number> | null;

  #lastInputTimeStamp: number | null = null;

  constructor(
    onInput: (event: IInputEvent) => void,
    options: PitchInputAdapterOptions = {},
  ) {
    this.#onInput = onInput;
    this.#validMidiNotes =
      options.validMidiNotes != null ? new Set(options.validMidiNotes) : null;
  }

  onPitch = (event: PitchEvent) => {
    if (
      this.#validMidiNotes != null &&
      !this.#validMidiNotes.has(event.midiNote)
    ) {
      return;
    }
    const inputEvent: IInputEvent = {
      type: "input",
      timeStamp: event.timeStamp,
      inputType: "appendChar",
      codePoint: event.midiNote,
      timeToType:
        this.#lastInputTimeStamp == null
          ? 0
          : event.timeStamp - this.#lastInputTimeStamp,
    };
    this.#onInput(inputEvent);
    this.#lastInputTimeStamp = event.timeStamp;
  };

  flush() {
    // Stability is resolved inside the processor; nothing to flush here.
  }

  reset() {
    this.#lastInputTimeStamp = null;
  }
}
