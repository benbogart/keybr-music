import { test } from "node:test";
import { deepEqual, equal } from "rich-assert";
import { PitchInputAdapter } from "./adapter.ts";

type Trace = Array<{
  readonly timeStamp: number;
  readonly codePoint: number;
  readonly timeToType: number;
}>;

function makeAdapter(validMidiNotes?: Iterable<number>) {
  const trace: Trace = [];
  const adapter = new PitchInputAdapter(
    (event) => {
      if (event.inputType === "appendChar") {
        trace.push({
          timeStamp: event.timeStamp,
          codePoint: event.codePoint,
          timeToType: event.timeToType,
        });
      }
    },
    validMidiNotes ? { validMidiNotes } : {},
  );
  return { adapter, trace };
}

test("emits an IInputEvent for every PitchEvent received (no latching)", () => {
  const { adapter, trace } = makeAdapter();

  adapter.onPitch({
    timeStamp: 10,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 80,
    midiNote: 62,
    frequency: 293.66,
    confidence: 1,
  });

  deepEqual(trace, [
    { timeStamp: 10, codePoint: 60, timeToType: 0 },
    { timeStamp: 80, codePoint: 62, timeToType: 70 },
  ]);
});

test(// Regression: after the pipeline refactor the processor only emits on note
// transitions (one PitchEvent per stable note), so the adapter must not
// wait for a *following* PitchEvent before forwarding the current one.
// Otherwise the UI indicator only moves when you play the NEXT note.
"regression: first and only stable note emits immediately (no lookahead)", () => {
  const { adapter, trace } = makeAdapter();

  adapter.onPitch({
    timeStamp: 250,
    midiNote: 60,
    frequency: 261.63,
    confidence: 0.97,
  });

  equal(trace.length, 1);
  deepEqual(trace[0], { timeStamp: 250, codePoint: 60, timeToType: 0 });
});

test("timeToType uses delta between successive emits, starting at zero", () => {
  const { adapter, trace } = makeAdapter();

  adapter.onPitch({
    timeStamp: 500,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 800,
    midiNote: 62,
    frequency: 293.66,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 2000,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });

  deepEqual(trace, [
    { timeStamp: 500, codePoint: 60, timeToType: 0 },
    { timeStamp: 800, codePoint: 62, timeToType: 300 },
    { timeStamp: 2000, codePoint: 60, timeToType: 1200 },
  ]);
});

test("validMidiNotes hard-gates out-of-range notes at adapter layer", () => {
  const { adapter, trace } = makeAdapter([60, 62]);

  adapter.onPitch({
    timeStamp: 10,
    midiNote: 59,
    frequency: 246.94,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 40,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 80,
    midiNote: 72,
    frequency: 523.25,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 120,
    midiNote: 62,
    frequency: 293.66,
    confidence: 1,
  });

  deepEqual(trace, [
    { timeStamp: 40, codePoint: 60, timeToType: 0 },
    { timeStamp: 120, codePoint: 62, timeToType: 80 },
  ]);
});

test("reset clears timeToType accumulator so next emit has timeToType 0", () => {
  const { adapter, trace } = makeAdapter();

  adapter.onPitch({
    timeStamp: 100,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.reset();
  adapter.onPitch({
    timeStamp: 500,
    midiNote: 62,
    frequency: 293.66,
    confidence: 1,
  });

  deepEqual(trace, [
    { timeStamp: 100, codePoint: 60, timeToType: 0 },
    { timeStamp: 500, codePoint: 62, timeToType: 0 },
  ]);
});
