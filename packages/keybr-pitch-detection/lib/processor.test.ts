import { test } from "node:test";
import { deepEqual, isNull } from "rich-assert";
import { StablePitchProcessor } from "./processor.ts";

test("window majority vote: emits when matchFrames of windowFrames agree", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    windowFrames: 4,
    matchFrames: 3,
  });

  isNull(
    processor.next({
      timeStamp: 10,
      frequency: 440,
      confidence: 0.95,
    }).event,
  );
  isNull(
    processor.next({
      timeStamp: 20,
      frequency: 880, // transient octave-up; must not derail the vote
      confidence: 0.95,
    }).event,
  );
  isNull(
    processor.next({
      timeStamp: 30,
      frequency: 440,
      confidence: 0.95,
    }).event,
  );

  const { event } = processor.next({
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

test("confidence threshold filters noise; only confident frames vote", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.8,
    windowFrames: 4,
    matchFrames: 3,
  });

  isNull(
    processor.next({
      timeStamp: 100,
      frequency: 440,
      confidence: 0.4, // dropped (low conf)
    }).event,
  );
  isNull(processor.next(null).event); // dropped (silence)
  isNull(
    processor.next({
      timeStamp: 300,
      frequency: 440,
      confidence: 0.9,
    }).event,
  );
  isNull(
    processor.next({
      timeStamp: 350,
      frequency: 440,
      confidence: 0.9,
    }).event,
  );

  const { event } = processor.next({
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
    windowFrames: 4,
    matchFrames: 3,
    validMidiNotes: [36, 38],
  });

  // B1 (MIDI 35) is outside the configured layout set and must be dropped.
  for (const t of [10, 20, 30, 40]) {
    isNull(
      processor.next({
        timeStamp: t,
        frequency: 61.74,
        confidence: 0.95,
      }).event,
    );
  }

  // C2 (MIDI 36) must accumulate votes before emitting.
  isNull(
    processor.next({
      timeStamp: 50,
      frequency: 65.41,
      confidence: 0.95,
    }).event,
  );
  isNull(
    processor.next({
      timeStamp: 60,
      frequency: 65.41,
      confidence: 0.95,
    }).event,
  );
  deepEqual(
    processor.next({
      timeStamp: 70,
      frequency: 65.41,
      confidence: 0.95,
    }).event,
    {
      timeStamp: 70,
      midiNote: 36,
      frequency: 65.41,
      confidence: 0.95,
    },
  );
});

test("legacy stableFrames option still compiles and emits a note", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    stableFrames: 2,
  });

  let got = null;
  for (let i = 0; i < 8; i += 1) {
    const { event } = processor.next({
      timeStamp: i * 10,
      frequency: 440,
      confidence: 0.95,
    });
    if (event != null) {
      got = event;
      break;
    }
  }
  deepEqual(got != null, true);
});
