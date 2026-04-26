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

test("envelope re-attack emits a fresh event when the same MIDI is replayed legato", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    windowFrames: 6,
    matchFrames: 4,
  });

  // Seed a sustained 440 Hz note and emit it.
  let firstEvent = null;
  for (let i = 0; i < 6; i += 1) {
    const r = processor.next(
      { timeStamp: i * 10, frequency: 440, confidence: 0.95 },
      0.1, // strong amplitude — establishes the envelope peak
    );
    if (r.event != null) {
      firstEvent = r.event;
      break;
    }
  }
  deepEqual(firstEvent?.midiNote, 69);

  // YIN keeps reporting 440 Hz through a brief amplitude dip — the kind of
  // legato re-attack where the sliding-window vote alone never marks the note
  // as released. The envelope detector must pick up the trough and the
  // following amplitude rise.
  const dipRms = [0.04, 0.02]; // dips below peak * releaseRatio
  for (const rms of dipRms) {
    isNull(
      processor.next({ timeStamp: 100, frequency: 440, confidence: 0.95 }, rms)
        .event,
    );
  }

  // Amplitude rises back — re-attack confirmed; the next confident frame
  // matching the previously emitted MIDI must fast-emit.
  const reAttack = processor.next(
    { timeStamp: 200, frequency: 440, confidence: 0.95 },
    0.08, // > trough * 2
  );
  deepEqual(reAttack.event?.midiNote, 69);
  deepEqual(reAttack.event?.timeStamp, 200);
});

test("envelope re-attack does NOT fire when the YIN frequency is drifting toward a different semitone", () => {
  const processor = new StablePitchProcessor({
    minConfidence: 0.6,
    windowFrames: 6,
    matchFrames: 4,
  });

  // Emit b4 (MIDI 71, ~493.88 Hz).
  let firstEvent = null;
  for (let i = 0; i < 6; i += 1) {
    const r = processor.next(
      { timeStamp: i * 10, frequency: 493.88, confidence: 0.95 },
      0.1,
    );
    if (r.event != null) {
      firstEvent = r.event;
      break;
    }
  }
  deepEqual(firstEvent?.midiNote, 71);

  // Trough then rise — envelope marks an attack pending.
  for (const rms of [0.04, 0.02]) {
    isNull(
      processor.next(
        { timeStamp: 100, frequency: 493.88, confidence: 0.95 },
        rms,
      ).event,
    );
  }

  // Rising-edge frame: YIN MIDI still rounds to 71 but the frequency has
  // already drifted nearly half a semitone toward c5 — this is the classic
  // note-transition straggler frame, not a legitimate b4 re-attack. Fast-emit
  // must reject it.
  isNull(
    processor.next({ timeStamp: 200, frequency: 508, confidence: 0.95 }, 0.08)
      .event,
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
