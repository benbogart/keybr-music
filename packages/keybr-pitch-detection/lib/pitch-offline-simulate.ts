import { rms } from "./detector.ts";
import { StablePitchProcessor } from "./processor.ts";
import { type PitchEvent } from "./types.ts";
import { YinPitchAnalyzer } from "./yin.ts";

const DEFAULT_HOP = 1024;
const DEFAULT_BUFFER = 2048;
const NO_NOISE = 0.0;

type OfflineHopsOptions = {
  /**
   * Analysis window in samples. Must be a power of 2, same as the Web Audio
   * `AnalyserNode.fftSize` for live use.
   */
  readonly bufferSize: number;
  /**
   * Advance in samples per frame (e.g. 1024 = 50% overlap for a 2048 window).
   */
  readonly hopSize: number;
  /** YIN / frequency limits (same as `createPitchDetector`). */
  readonly yin: ConstructorParameters<typeof YinPitchAnalyzer>[1];
  /** Gating and stability (same as `createPitchDetector`). */
  readonly stable: ConstructorParameters<typeof StablePitchProcessor>[0];
  /**
   * Same as `noiseFloor` on `WebAudioPitchDetector`. Default 0 (always analyze; use 0.01+ to model the app).
   */
  readonly noiseFloor?: number;
  /**
   * Time in ms for each window’s “frame” (e.g. `(o / sampleRate) * 1000`).
   */
  readonly timeStampForOffset: (offsetSamples: number) => number;
};

/**
 * Feeds a mono `Float32` buffer through YIN + `StablePitchProcessor` in overlapping hops,
 * mirroring `WebAudioPitchDetector` without the Web Audio node.
 */
export function simulateOfflinePitchHops(
  channel: Float32Array,
  sampleRate: number,
  options: OfflineHopsOptions,
): readonly PitchEvent[] {
  const { bufferSize, hopSize, yin, stable, timeStampForOffset } = options;
  const noiseFloor = options.noiseFloor ?? NO_NOISE;
  const analyzer = new YinPitchAnalyzer(bufferSize, yin);
  const processor = new StablePitchProcessor(stable);
  const work = new Float32Array(bufferSize);
  const events: PitchEvent[] = [];

  for (let o = 0; o + bufferSize <= channel.length; o += hopSize) {
    work.set(channel.subarray(o, o + bufferSize));
    const level = rms(work);
    const timeStamp = timeStampForOffset(o);
    if (level < noiseFloor) {
      processor.next(null);
      continue;
    }
    const detected = analyzer.detect(work, sampleRate);
    if (detected == null) {
      processor.next(null);
      continue;
    }
    const { event } = processor.next({
      timeStamp,
      frequency: detected.frequency,
      confidence: detected.confidence,
    });
    if (event != null) {
      events.push(event);
    }
  }

  return events;
}

/** Map `/pitch-test`-style `createPitchDetector` options to hop simulation. */
export function defaultOfflineHopsFromDetectorOptions(args: {
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly yinThreshold: number;
  readonly minConfidence: number;
  readonly stableFrames: number;
  readonly validMidiNotes?: ReadonlySet<number> | null;
  readonly bufferSize?: number;
  readonly hopSize?: number;
}): Pick<OfflineHopsOptions, "bufferSize" | "hopSize" | "yin" | "stable"> {
  return {
    bufferSize: args.bufferSize ?? DEFAULT_BUFFER,
    hopSize: args.hopSize ?? DEFAULT_HOP,
    yin: {
      minFrequency: args.minFrequency,
      maxFrequency: args.maxFrequency,
      threshold: args.yinThreshold,
    },
    stable: {
      minConfidence: args.minConfidence,
      stableFrames: args.stableFrames,
      validMidiNotes: args.validMidiNotes ?? undefined,
    },
  };
}

/** One entry per time the detected MIDI changes in the `events` list (sustained-note regions). */
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
