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
      console.log(
        "[MUSIC] PitchInputHandler: start() called but already focused, skipping",
      );
      return this.#startPromise ?? Promise.resolve();
    }

    console.log(
      "[MUSIC] PitchInputHandler: start() — setting focused, creating detector",
    );
    this.#focused = true;
    this.#callbacks.onFocus?.();

    const detector = this.#createDetector(this.#detectorOptions);
    detector.onPitch = this.#adapter.onPitch;
    detector.onLevel = NOOP_LEVEL_HANDLER;
    this.#detector = detector;

    const startPromise = detector
      .start()
      .then(() => {
        console.log(
          "[MUSIC] PitchInputHandler: detector.start() resolved, focused=%s",
          this.#focused,
        );
        if (!this.#focused && this.#detector === detector) {
          detector.stop();
          this.#detector = null;
        }
      })
      .catch((error) => {
        console.error(
          "[MUSIC] PitchInputHandler: detector.start() FAILED:",
          error,
        );
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
    console.log(
      "[MUSIC] PitchInputHandler: stop() called, was focused=%s",
      this.#focused,
    );
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

  focus() {
    void this.start();
  }

  blur() {
    this.stop();
  }
}
