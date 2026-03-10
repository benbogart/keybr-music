import { StablePitchProcessor } from "./processor.ts";
import { type PitchDetector, type PitchDetectorOptions } from "./types.ts";
import { YinPitchAnalyzer } from "./yin.ts";

const DEFAULT_BUFFER_SIZE = 2048;

type RequiredPitchDetectorOptions = {
  readonly bufferSize: number;
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly minConfidence: number;
  readonly stableFrames: number;
  readonly yinThreshold: number;
  readonly noiseFloor: number;
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
  readonly #processor: StablePitchProcessor;
  #analyzer: YinPitchAnalyzer | null = null;
  #audioContext: AudioContext | null = null;
  #stream: MediaStream | null = null;
  #source: MediaStreamAudioSourceNode | null = null;
  #analyserNode: AnalyserNode | null = null;
  #buffer = new Float32Array(0);
  #frameId = 0;

  constructor(options: PitchDetectorOptions = {}) {
    this.#options = {
      bufferSize: normalizeBufferSize(
        options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      ),
      minFrequency: options.minFrequency ?? 50,
      maxFrequency: options.maxFrequency ?? 2000,
      minConfidence: options.minConfidence ?? 0.7,
      stableFrames: Math.max(1, options.stableFrames ?? 2),
      yinThreshold: options.yinThreshold ?? 0.12,
      noiseFloor: options.noiseFloor ?? 0.01,
    };
    this.#processor = new StablePitchProcessor({
      minConfidence: this.#options.minConfidence,
      stableFrames: this.#options.stableFrames,
    });
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
      this.#analyzer = new YinPitchAnalyzer(analyserNode.fftSize, {
        minFrequency: this.#options.minFrequency,
        maxFrequency: this.#options.maxFrequency,
        threshold: this.#options.yinThreshold,
      });
      this.#processor.reset();
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
    this.#analyzer = null;
    this.#buffer = new Float32Array(0);
    this.#processor.reset();
  }

  #tick = () => {
    const analyserNode = this.#analyserNode;
    const analyzer = this.#analyzer;
    const audioContext = this.#audioContext;
    if (analyserNode == null || analyzer == null || audioContext == null) {
      return;
    }

    analyserNode.getFloatTimeDomainData(this.#buffer);
    const level = rms(this.#buffer);
    this.onLevel(level);
    const detectedPitch =
      level >= this.#options.noiseFloor
        ? analyzer.detect(this.#buffer, audioContext.sampleRate)
        : null;
    const event = this.#processor.next(
      detectedPitch == null
        ? null
        : {
            timeStamp: performance.now(),
            frequency: detectedPitch.frequency,
            confidence: detectedPitch.confidence,
          },
    );
    if (event != null) {
      this.onPitch(event);
    }

    this.#frameId = requestAnimationFrame(this.#tick);
  };
}

export function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
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
