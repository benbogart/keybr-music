export type YinOptions = {
  readonly minFrequency?: number;
  readonly maxFrequency?: number;
  readonly threshold?: number;
};

export type YinPitch = {
  readonly frequency: number;
  readonly confidence: number;
};

const DEFAULT_MIN_FREQUENCY = 50;
const DEFAULT_MAX_FREQUENCY = 2000;
const DEFAULT_THRESHOLD = 0.12;

/**
 * Single-frame YIN pitch estimator.
 *
 * This class does one thing: given a buffer of audio samples and its sample rate,
 * return a best-guess pitch (fundamental frequency, in Hz) and a 0..1 confidence.
 *
 * It is intentionally noisy at the frame level (attack transients, vibrato, and
 * reedy overtones can all push individual frames an octave away from the truth).
 * The frame-level output is meant to be stabilized across many frames by
 * `StablePitchProcessor`; see `PitchPipeline` for the combined view.
 */
export class YinPitchAnalyzer {
  readonly #difference: Float32Array;
  readonly #cmnd: Float32Array;
  readonly #threshold: number;
  readonly #minFrequency: number;
  readonly #maxFrequency: number;

  constructor(bufferSize: number, options: YinOptions = {}) {
    this.#difference = new Float32Array(bufferSize);
    this.#cmnd = new Float32Array(bufferSize);
    this.#threshold = options.threshold ?? DEFAULT_THRESHOLD;
    this.#minFrequency = options.minFrequency ?? DEFAULT_MIN_FREQUENCY;
    this.#maxFrequency = options.maxFrequency ?? DEFAULT_MAX_FREQUENCY;
  }

  detect(signal: Float32Array, sampleRate: number): YinPitch | null {
    const limit = Math.floor(signal.length / 2);
    const minTau = Math.max(2, Math.floor(sampleRate / this.#maxFrequency));
    const maxTau = Math.min(
      limit - 1,
      Math.floor(sampleRate / this.#minFrequency),
    );
    if (minTau >= maxTau) {
      return null;
    }

    this.#difference.fill(0, minTau, maxTau + 1);
    for (let tau = minTau; tau <= maxTau; tau += 1) {
      let sum = 0;
      for (let i = 0; i < limit; i += 1) {
        const delta = signal[i] - signal[i + tau];
        sum += delta * delta;
      }
      this.#difference[tau] = sum;
    }

    this.#cmnd[minTau] = 1;
    let runningSum = 0;
    for (let tau = minTau + 1; tau <= maxTau; tau += 1) {
      runningSum += this.#difference[tau];
      this.#cmnd[tau] =
        runningSum > 0 ? (this.#difference[tau] * tau) / runningSum : 1;
    }

    let tauEstimate = 0;
    for (let tau = minTau + 1; tau <= maxTau; tau += 1) {
      if (this.#cmnd[tau] < this.#threshold) {
        tauEstimate = tau;
        while (
          tauEstimate < maxTau &&
          this.#cmnd[tauEstimate + 1] < this.#cmnd[tauEstimate]
        ) {
          tauEstimate += 1;
        }
        break;
      }
    }
    if (tauEstimate === 0) {
      return null;
    }

    const betterTau = this.#parabolicInterpolation(tauEstimate, minTau, maxTau);
    if (!Number.isFinite(betterTau) || betterTau <= 0) {
      return null;
    }

    const frequency = sampleRate / betterTau;
    if (
      !Number.isFinite(frequency) ||
      frequency < this.#minFrequency ||
      frequency > this.#maxFrequency
    ) {
      return null;
    }

    return {
      frequency,
      confidence: Math.max(0, Math.min(1, 1 - this.#cmnd[tauEstimate])),
    };
  }

  #parabolicInterpolation(
    tauEstimate: number,
    minTau: number,
    maxTau: number,
  ): number {
    const x0 = tauEstimate > minTau ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate < maxTau ? tauEstimate + 1 : tauEstimate;
    if (x0 === tauEstimate || x2 === tauEstimate) {
      return tauEstimate;
    }
    const y0 = this.#cmnd[x0];
    const y1 = this.#cmnd[tauEstimate];
    const y2 = this.#cmnd[x2];
    const denominator = 2 * (2 * y1 - y2 - y0);
    if (denominator === 0) {
      return tauEstimate;
    }
    return tauEstimate + (y2 - y0) / denominator;
  }
}
