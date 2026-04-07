export type PitchEvent = {
  readonly timeStamp: number;
  readonly midiNote: number;
  readonly frequency: number;
  readonly confidence: number;
};

/** One animation-frame snapshot for debugging pitch detection (e.g. browser console on /pitch-test). */
export type PitchDiagnosticSnapshot = {
  readonly timeStamp: number;
  readonly rms: number;
  /** YIN output before confidence / layout / stability gates; null if below noise floor or YIN found nothing. */
  readonly yin: null | {
    readonly frequency: number;
    readonly confidence: number;
    readonly midiNote: number;
  };
  /** First gate that blocked using this frame for stability / emit; null if YIN produced a candidate. */
  readonly blockedBy: null | "rms" | "yin_null";
  /** Processor dropped the raw candidate (confidence or layout gate). */
  readonly processorRejected: null | "low_confidence" | "invalid_note";
  /** Waiting for repeated identical MIDI before emitting. */
  readonly stabilizing: null | {
    readonly midiNote: number;
    readonly frames: number;
    readonly requiredFrames: number;
  };
  /** Event passed to onPitch this frame, if any. */
  readonly emitted: PitchEvent | null;
};

export type PitchDetector = {
  start(): Promise<void>;
  stop(): void;
  onPitch: (event: PitchEvent) => void;
  onLevel: (rms: number) => void;
};

export type PitchDetectorOptions = {
  readonly bufferSize?: number;
  readonly minFrequency?: number;
  readonly maxFrequency?: number;
  readonly minConfidence?: number;
  readonly stableFrames?: number;
  readonly validMidiNotes?: Iterable<number>;
  readonly yinThreshold?: number;
  readonly noiseFloor?: number;
  /** When set, called every frame with RMS, raw YIN, and processor state (use for console debugging). */
  readonly onPitchDiagnostic?: (snapshot: PitchDiagnosticSnapshot) => void;
};
