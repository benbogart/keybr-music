import {
  createPitchDetector,
  type PitchDetector,
  type PitchDetectorOptions,
} from "@keybr/pitch-detection";
import { type Focusable } from "@keybr/widget";
import { PitchInputAdapter, type PitchInputAdapterOptions } from "./adapter.ts";
import { type Callbacks } from "./types.ts";

type CreatePitchDetector = (options: PitchDetectorOptions) => PitchDetector;

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

function countIterable(
  values: Iterable<unknown> | null | undefined,
): number | null {
  if (values == null) {
    return null;
  }
  let count = 0;
  for (const _ of values) {
    void _;
    count += 1;
  }
  return count;
}

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
    // #region agent log
    agentDebugLog("D", "inputhandler.ts:65", "pitch handler constructed", {
      adapterValidMidiNotesCount: countIterable(options.validMidiNotes),
      detectorValidMidiNotesCount: countIterable(
        options.detectorOptions?.validMidiNotes,
      ),
    });
    // #endregion
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
    // #region agent log
    agentDebugLog("D", "inputhandler.ts:91", "detector created on start", {
      detectorValidMidiNotesCount: countIterable(
        this.#detectorOptions.validMidiNotes,
      ),
    });
    // #endregion
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

  focus() {
    void this.start();
  }

  blur() {
    this.stop();
  }
}
