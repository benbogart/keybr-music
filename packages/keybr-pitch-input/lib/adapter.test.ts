import { test } from "node:test";
import { deepEqual } from "rich-assert";
import { PitchInputAdapter } from "./adapter.ts";

test("first note has zero timeToType and following notes use note deltas", () => {
  const trace: Array<{
    readonly timeStamp: number;
    readonly codePoint: number;
    readonly timeToType: number;
  }> = [];
  const adapter = new PitchInputAdapter((event) => {
    trace.push({
      timeStamp: event.timeStamp,
      codePoint: event.codePoint,
      timeToType: event.timeToType,
    });
  });

  adapter.onPitch({
    timeStamp: 10,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 50,
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
  adapter.onPitch({
    timeStamp: 130,
    midiNote: 62,
    frequency: 293.66,
    confidence: 1,
  });
  adapter.flush();

  deepEqual(trace, [
    { timeStamp: 10, codePoint: 60, timeToType: 0 },
    { timeStamp: 80, codePoint: 62, timeToType: 70 },
  ]);
});

test("downward octave artifact is corrected while upward jump is preserved", () => {
  const trace: Array<{
    readonly timeStamp: number;
    readonly codePoint: number;
    readonly timeToType: number;
  }> = [];
  const adapter = new PitchInputAdapter((event) => {
    trace.push({
      timeStamp: event.timeStamp,
      codePoint: event.codePoint,
      timeToType: event.timeToType,
    });
  });

  adapter.onPitch({
    timeStamp: 100,
    midiNote: 72,
    frequency: 523.25,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 120,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 170,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });

  adapter.onPitch({
    timeStamp: 320,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 340,
    midiNote: 72,
    frequency: 523.25,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 380,
    midiNote: 72,
    frequency: 523.25,
    confidence: 1,
  });
  adapter.flush();

  deepEqual(trace, [
    { timeStamp: 120, codePoint: 60, timeToType: 0 },
    { timeStamp: 320, codePoint: 60, timeToType: 200 },
    { timeStamp: 340, codePoint: 72, timeToType: 20 },
  ]);
});

test("silence gaps do not emit extra events and allow repeated notes", () => {
  const trace: Array<{
    readonly timeStamp: number;
    readonly codePoint: number;
    readonly timeToType: number;
  }> = [];
  const adapter = new PitchInputAdapter((event) => {
    trace.push({
      timeStamp: event.timeStamp,
      codePoint: event.codePoint,
      timeToType: event.timeToType,
    });
  });

  adapter.onPitch({
    timeStamp: 10,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 50,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 300,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.onPitch({
    timeStamp: 340,
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.flush();

  deepEqual(trace, [
    { timeStamp: 10, codePoint: 60, timeToType: 0 },
    { timeStamp: 300, codePoint: 60, timeToType: 290 },
  ]);
});

test("out-of-range notes are ignored before input emission", () => {
  const trace: Array<{
    readonly timeStamp: number;
    readonly codePoint: number;
    readonly timeToType: number;
  }> = [];
  const adapter = new PitchInputAdapter(
    (event) => {
      trace.push({
        timeStamp: event.timeStamp,
        codePoint: event.codePoint,
        timeToType: event.timeToType,
      });
    },
    { validMidiNotes: [60] },
  );

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
    midiNote: 60,
    frequency: 261.63,
    confidence: 1,
  });
  adapter.flush();

  deepEqual(trace, [{ timeStamp: 40, codePoint: 60, timeToType: 0 }]);
});
