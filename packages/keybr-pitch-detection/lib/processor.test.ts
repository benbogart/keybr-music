import { test } from "node:test";
import { deepEqual, isNull } from "rich-assert";
import { StablePitchProcessor } from "./processor.ts";

test("debouncing suppresses transient pitch jumps", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    stableFrames: 2,
  });

  isNull(
    processor.next({
      timeStamp: 10,
      frequency: 440,
      confidence: 0.95,
    }),
  );
  isNull(
    processor.next({
      timeStamp: 20,
      frequency: 466.16,
      confidence: 0.95,
    }),
  );
  isNull(
    processor.next({
      timeStamp: 30,
      frequency: 440,
      confidence: 0.95,
    }),
  );

  const event = processor.next({
    timeStamp: 40,
    frequency: 440,
    confidence: 0.95,
  });

  deepEqual(event, {
    timeStamp: 40,
    midiNote: 69,
    frequency: 440,
    confidence: 0.95,
  });
});

test("confidence threshold filters noise and silence", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.8,
    stableFrames: 2,
  });

  isNull(
    processor.next({
      timeStamp: 100,
      frequency: 440,
      confidence: 0.4,
    }),
  );
  isNull(processor.next(null));
  isNull(
    processor.next({
      timeStamp: 300,
      frequency: 440,
      confidence: 0.9,
    }),
  );

  const event = processor.next({
    timeStamp: 400,
    frequency: 440,
    confidence: 0.9,
  });

  deepEqual(event, {
    timeStamp: 400,
    midiNote: 69,
    frequency: 440,
    confidence: 0.9,
  });
});

test("valid-note hard gate discards impossible notes", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    stableFrames: 2,
    validMidiNotes: [36, 38],
  });

  // B1 (MIDI 35) is outside the configured layout set and must be dropped.
  isNull(
    processor.next({
      timeStamp: 10,
      frequency: 61.74,
      confidence: 0.95,
    }),
  );
  isNull(
    processor.next({
      timeStamp: 20,
      frequency: 61.74,
      confidence: 0.95,
    }),
  );

  isNull(
    processor.next({
      timeStamp: 30,
      frequency: 65.41,
      confidence: 0.95,
    }),
  );
  deepEqual(
    processor.next({
      timeStamp: 40,
      frequency: 65.41,
      confidence: 0.95,
    }),
    {
      timeStamp: 40,
      midiNote: 36,
      frequency: 65.41,
      confidence: 0.95,
    },
  );
});
