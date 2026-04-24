import { frequencyToMidiNote } from "./midi.ts";
import {
  StablePitchProcessor,
  type StablePitchProcessorResult,
} from "./processor.ts";
import {
  type PitchDetectorOptions,
  type PitchDiagnosticSnapshot,
  type PitchEvent,
} from "./types.ts";
import { type YinOptions, YinPitchAnalyzer } from "./yin.ts";

export type PitchPipelineOptions = {
  readonly bufferSize: number;
  readonly yin: YinOptions;
  readonly stable: ConstructorParameters<typeof StablePitchProcessor>[0];
  /**
   * RMS below this is treated as silence; YIN is skipped and the processor
   * receives a `null` frame.
   */
  readonly noiseFloor?: number;
};

export type PitchPipelineFrameResult = {
  readonly rms: number;
  readonly timeStamp: number;
  readonly event: PitchEvent | null;
  readonly diagnostic: PitchDiagnosticSnapshot;
};

const DEFAULT_NOISE_FLOOR = 0.0;

/**
 * Single source of truth for the pitch detection pipeline.
 *
 * Every caller — the live Web Audio detector, offline test harnesses,
 * future batch tools — should instantiate a `PitchPipeline` and feed it
 * fixed-size analysis windows via `processFrame`. This guarantees that the
 * app, `/pitch-test`, and unit tests run identical detection code.
 */
export class PitchPipeline {
  readonly #analyzer: YinPitchAnalyzer;
  readonly #processor: StablePitchProcessor;
  readonly #noiseFloor: number;
  readonly #bufferSize: number;

  constructor(options: PitchPipelineOptions) {
    this.#analyzer = new YinPitchAnalyzer(options.bufferSize, options.yin);
    this.#processor = new StablePitchProcessor(options.stable);
    this.#noiseFloor = options.noiseFloor ?? DEFAULT_NOISE_FLOOR;
    this.#bufferSize = options.bufferSize;
  }

  /** The analysis window length expected in each `processFrame` call. */
  get bufferSize(): number {
    return this.#bufferSize;
  }

  reset(): void {
    this.#processor.reset();
  }

  /**
   * Feed one analysis window into the pipeline.
   *
   * @param signal  Window of mono float samples, length must equal `bufferSize`.
   * @param sampleRate  Sample rate of `signal` in Hz.
   * @param timeStamp  Monotonic timestamp in ms to attach to any emitted event.
   */
  processFrame(
    signal: Float32Array,
    sampleRate: number,
    timeStamp: number,
  ): PitchPipelineFrameResult {
    const rmsLevel = computeRms(signal);
    const belowNoise = rmsLevel < this.#noiseFloor;
    const yin = belowNoise ? null : this.#analyzer.detect(signal, sampleRate);

    const processorResult: StablePitchProcessorResult = this.#processor.next(
      yin == null
        ? null
        : {
            timeStamp,
            frequency: yin.frequency,
            confidence: yin.confidence,
          },
    );

    const diagnostic: PitchDiagnosticSnapshot = {
      timeStamp,
      rms: rmsLevel,
      yin:
        yin == null
          ? null
          : {
              frequency: yin.frequency,
              confidence: yin.confidence,
              midiNote: frequencyToMidiNote(yin.frequency),
            },
      blockedBy: belowNoise ? "rms" : yin == null ? "yin_null" : null,
      processorRejected: processorResult.processorRejected,
      stabilizing: processorResult.stabilizing,
      emitted: processorResult.event,
    };

    return {
      rms: rmsLevel,
      timeStamp,
      event: processorResult.event,
      diagnostic,
    };
  }
}

/**
 * Replay a contiguous mono buffer through a `PitchPipeline` in fixed hops.
 *
 * Returns every emitted `PitchEvent` in order. Test harnesses use this to
 * replay bandoneon recordings; it is the non-DOM counterpart to the live
 * detector's `requestAnimationFrame` loop.
 */
export function replayOffline(
  pipeline: PitchPipeline,
  channel: Float32Array,
  sampleRate: number,
  hopSize: number,
  timeStampForOffset: (offsetSamples: number) => number = (o) =>
    (o / sampleRate) * 1000,
): readonly PitchEvent[] {
  const bufferSize = pipeline.bufferSize;
  const work = new Float32Array(bufferSize);
  const events: PitchEvent[] = [];
  for (
    let offset = 0;
    offset + bufferSize <= channel.length;
    offset += hopSize
  ) {
    work.set(channel.subarray(offset, offset + bufferSize));
    const { event } = pipeline.processFrame(
      work,
      sampleRate,
      timeStampForOffset(offset),
    );
    if (event != null) {
      events.push(event);
    }
  }
  return events;
}

/** One entry per time the detected MIDI changes in `events` (sustained-note regions). */
export function collapseConsecutiveMidiNotes(
  events: ReadonlyArray<{ readonly midiNote: number }>,
): number[] {
  const out: number[] = [];
  for (const e of events) {
    if (out.length === 0 || out[out.length - 1] !== e.midiNote) {
      out.push(e.midiNote);
    }
  }
  return out;
}

export function computeRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

const DEFAULT_PIPELINE_BUFFER = 2048;
const DEFAULT_PIPELINE_WINDOW = 6;
const DEFAULT_PIPELINE_MATCH = 4;
const DEFAULT_PIPELINE_YIN_THRESHOLD = 0.12;
const DEFAULT_PIPELINE_MIN_CONFIDENCE = 0.7;
const DEFAULT_PIPELINE_MIN_FREQ = 50;
const DEFAULT_PIPELINE_MAX_FREQ = 2000;
const DEFAULT_PIPELINE_NOISE_FLOOR = 0.01;

/**
 * Construct a `PitchPipeline` from the same options the live detector uses.
 *
 * This is the intended entry point for tests, batch replay tools, and anything
 * that is *not* the live Web Audio microphone feed, so detection stays
 * bit-identical between production and tests.
 */
export function createPitchPipelineFromOptions(
  options: PitchDetectorOptions = {},
  overrides: Partial<
    Pick<PitchPipelineOptions, "bufferSize" | "noiseFloor">
  > = {},
): PitchPipeline {
  const bufferSize =
    overrides.bufferSize ?? options.bufferSize ?? DEFAULT_PIPELINE_BUFFER;
  const legacyStable = options.stableFrames;
  const windowFrames =
    options.windowFrames ??
    (legacyStable != null
      ? Math.max(DEFAULT_PIPELINE_WINDOW, legacyStable * 2)
      : DEFAULT_PIPELINE_WINDOW);
  const matchFrames = Math.min(
    windowFrames,
    options.matchFrames ?? DEFAULT_PIPELINE_MATCH,
  );

  return new PitchPipeline({
    bufferSize,
    noiseFloor:
      overrides.noiseFloor ??
      options.noiseFloor ??
      DEFAULT_PIPELINE_NOISE_FLOOR,
    yin: {
      minFrequency: options.minFrequency ?? DEFAULT_PIPELINE_MIN_FREQ,
      maxFrequency: options.maxFrequency ?? DEFAULT_PIPELINE_MAX_FREQ,
      threshold: options.yinThreshold ?? DEFAULT_PIPELINE_YIN_THRESHOLD,
    },
    stable: {
      minConfidence: options.minConfidence ?? DEFAULT_PIPELINE_MIN_CONFIDENCE,
      windowFrames,
      matchFrames,
      validMidiNotes: options.validMidiNotes,
    },
  });
}

export const DEFAULT_OFFLINE_HOP_SIZE = 1024;
