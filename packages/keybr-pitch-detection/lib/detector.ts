import { PitchPipeline } from "./pipeline.ts";
import {
  type PitchDetector,
  type PitchDetectorOptions,
  type PitchDiagnosticSnapshot,
} from "./types.ts";

const DEFAULT_BUFFER_SIZE = 2048;
const DEFAULT_MIN_FREQUENCY = 50;
const DEFAULT_MAX_FREQUENCY = 2000;
const DEFAULT_MIN_CONFIDENCE = 0.7;
const DEFAULT_WINDOW_FRAMES = 6;
const DEFAULT_MATCH_FRAMES = 4;
const DEFAULT_YIN_THRESHOLD = 0.12;
const DEFAULT_NOISE_FLOOR = 0.01;

type RequiredPitchDetectorOptions = {
  readonly bufferSize: number;
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly minConfidence: number;
  readonly windowFrames: number;
  readonly matchFrames: number;
  readonly validMidiNotes?: Iterable<number>;
  readonly yinThreshold: number;
  readonly noiseFloor: number;
  readonly onPitchDiagnostic?: (snapshot: PitchDiagnosticSnapshot) => void;
};

export function createPitchDetector(
  options: PitchDetectorOptions = {},
): PitchDetector {
  return new WebAudioPitchDetector(options);
}

export class WebAudioPitchDetector implements PitchDetector {
  onPitch: PitchDetector["onPitch"] = () => {};
  onLevel: PitchDetector["onLevel"] = () => {};

  readonly #options: RequiredPitchDetectorOptions;
  #pipeline: PitchPipeline | null = null;
  #audioContext: AudioContext | null = null;
  #stream: MediaStream | null = null;
  #source: MediaStreamAudioSourceNode | null = null;
  #analyserNode: AnalyserNode | null = null;
  #buffer = new Float32Array(0);
  #frameId = 0;

  constructor(options: PitchDetectorOptions = {}) {
    const { windowFrames, matchFrames } = resolveStabilityOptions(options);
    this.#options = {
      bufferSize: normalizeBufferSize(
        options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      ),
      minFrequency: options.minFrequency ?? DEFAULT_MIN_FREQUENCY,
      maxFrequency: options.maxFrequency ?? DEFAULT_MAX_FREQUENCY,
      minConfidence: options.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
      windowFrames,
      matchFrames,
      validMidiNotes: options.validMidiNotes,
      yinThreshold: options.yinThreshold ?? DEFAULT_YIN_THRESHOLD,
      noiseFloor: options.noiseFloor ?? DEFAULT_NOISE_FLOOR,
      onPitchDiagnostic: options.onPitchDiagnostic,
    };
  }

  async start() {
    if (this.#frameId !== 0) {
      return;
    }
    if (
      typeof navigator === "undefined" ||
      navigator.mediaDevices?.getUserMedia == null
    ) {
      throw new Error("Microphone access is not available.");
    }
    if (typeof requestAnimationFrame === "undefined") {
      throw new Error("requestAnimationFrame is not available.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    try {
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = this.#options.bufferSize;
      analyserNode.smoothingTimeConstant = 0;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserNode);

      this.#stream = stream;
      this.#audioContext = audioContext;
      this.#source = source;
      this.#analyserNode = analyserNode;
      this.#buffer = new Float32Array(analyserNode.fftSize);
      this.#pipeline = new PitchPipeline({
        bufferSize: analyserNode.fftSize,
        noiseFloor: this.#options.noiseFloor,
        yin: {
          minFrequency: this.#options.minFrequency,
          maxFrequency: this.#options.maxFrequency,
          threshold: this.#options.yinThreshold,
        },
        stable: {
          minConfidence: this.#options.minConfidence,
          windowFrames: this.#options.windowFrames,
          matchFrames: this.#options.matchFrames,
          validMidiNotes: this.#options.validMidiNotes,
        },
      });
      this.#frameId = requestAnimationFrame(this.#tick);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      await audioContext.close();
      throw error;
    }
  }

  stop() {
    if (this.#frameId !== 0) {
      cancelAnimationFrame(this.#frameId);
      this.#frameId = 0;
    }
    this.#source?.disconnect();
    this.#analyserNode?.disconnect();
    this.#stream?.getTracks().forEach((track) => track.stop());
    void this.#audioContext?.close();

    this.#stream = null;
    this.#audioContext = null;
    this.#source = null;
    this.#analyserNode = null;
    this.#pipeline = null;
    this.#buffer = new Float32Array(0);
  }

  #tick = () => {
    const analyserNode = this.#analyserNode;
    const pipeline = this.#pipeline;
    const audioContext = this.#audioContext;
    if (analyserNode == null || pipeline == null || audioContext == null) {
      return;
    }

    analyserNode.getFloatTimeDomainData(this.#buffer);
    const timeStamp = performance.now();
    const { rms, event, diagnostic } = pipeline.processFrame(
      this.#buffer,
      audioContext.sampleRate,
      timeStamp,
    );
    this.onLevel(rms);
    this.#options.onPitchDiagnostic?.(diagnostic);
    if (event != null) {
      this.onPitch(event);
    }

    this.#frameId = requestAnimationFrame(this.#tick);
  };
}

function normalizeBufferSize(value: number): number {
  if (!Number.isFinite(value) || value < 32) {
    return DEFAULT_BUFFER_SIZE;
  }
  let size = 32;
  while (size < value && size < 32768) {
    size <<= 1;
  }
  return size;
}

function resolveStabilityOptions(options: PitchDetectorOptions) {
  const legacyStableFrames = options.stableFrames;
  const windowFrames =
    options.windowFrames ??
    (legacyStableFrames != null
      ? Math.max(DEFAULT_WINDOW_FRAMES, legacyStableFrames * 2)
      : DEFAULT_WINDOW_FRAMES);
  const matchFrames = Math.max(
    1,
    Math.min(windowFrames, options.matchFrames ?? DEFAULT_MATCH_FRAMES),
  );
  return { windowFrames, matchFrames };
}
