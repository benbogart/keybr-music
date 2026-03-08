export type PitchEvent = {
  readonly timeStamp: number;
  readonly midiNote: number;
  readonly frequency: number;
  readonly confidence: number;
};

export type PitchDetector = {
  start(): Promise<void>;
  stop(): void;
  onPitch: (event: PitchEvent) => void;
};

export type PitchDetectorOptions = {
  readonly bufferSize?: number;
  readonly minFrequency?: number;
  readonly maxFrequency?: number;
  readonly minConfidence?: number;
  readonly stableFrames?: number;
  readonly yinThreshold?: number;
};
