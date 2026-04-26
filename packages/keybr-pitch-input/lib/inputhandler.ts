import {
  createPitchDetector,
  type PitchDetector,
  type PitchDetectorOptions,
} from "@keybr/pitch-detection";
import { type Focusable } from "@keybr/widget";
import { PitchInputAdapter, type PitchInputAdapterOptions } from "./adapter.ts";
import { type Callbacks } from "./types.ts";

type CreatePitchDetector = (options: PitchDetectorOptions) => PitchDetector;

export type PitchInputHandlerOptions = PitchInputAdapterOptions & {
  readonly detectorOptions?: PitchDetectorOptions;
  readonly createDetector?: CreatePitchDetector;
};

const NOOP_LEVEL_HANDLER: PitchDetector["onLevel"] = () => {};

export class PitchInputHandler implements Focusable {
  readonly #adapter: PitchInputAdapter;
  readonly #detectorOptions: PitchDetectorOptions;
  readonly #createDetector: CreatePitchDetector;

  #callbacks: Callbacks = {};
  #detector: PitchDetector | null = null;
  #startPromise: Promise<void> | null = null;
  #focused = false;

  constructor(options: PitchInputHandlerOptions = {}) {
    this.#adapter = new PitchInputAdapter((event) => {
      this.#callbacks.onInput?.(event);
    }, options);
    this.#detectorOptions = options.detectorOptions ?? {};
    this.#createDetector = options.createDetector ?? createPitchDetector;
  }

  setCallbacks(callbacks: Callbacks) {
    this.#callbacks = callbacks;
  }

  async start() {
    if (this.#focused) {
      return this.#startPromise ?? Promise.resolve();
    }

    this.#focused = true;
    this.#callbacks.onFocus?.();

    const detector = this.#createDetector(this.#detectorOptions);
    detector.onPitch = this.#adapter.onPitch;
    detector.onLevel = NOOP_LEVEL_HANDLER;
    this.#detector = detector;

    const startPromise = detector
      .start()
      .then(() => {
        if (!this.#focused && this.#detector === detector) {
          detector.stop();
          this.#detector = null;
        }
      })
      .catch((error) => {
        if (this.#detector === detector) {
          this.#detector = null;
        }
        if (this.#focused) {
          this.#focused = false;
          this.#callbacks.onBlur?.();
        }
        throw error;
      })
      .finally(() => {
        if (this.#startPromise === startPromise) {
          this.#startPromise = null;
        }
      });

    this.#startPromise = startPromise;
    return startPromise;
  }

  stop() {
    const focused = this.#focused;
    this.#focused = false;

    this.#adapter.flush();
    this.#adapter.reset();
    this.#detector?.stop();
    this.#detector = null;
    this.#startPromise = null;

    if (focused) {
      this.#callbacks.onBlur?.();
    }
  }

  /**
   * Discard pitch-pipeline emit-tracking state (last note, vote window,
   * envelope) and the adapter's `timeToType` baseline, without stopping the
   * detector or releasing the microphone. Used by consumers to mark a session
   * boundary (e.g. a music lesson transition) so the first note of the next
   * session registers as a fresh attack instead of being suppressed as a
   * continuation of whatever the processor last emitted.
   */
  reset() {
    this.#adapter.reset();
    this.#detector?.reset();
  }

  focus() {
    void this.start();
  }

  blur() {
    this.stop();
  }
}
