import { test } from "node:test";
import { type PitchDetector, type PitchEvent } from "@keybr/pitch-detection";
import { deepEqual, isTrue } from "rich-assert";
import { PitchInputHandler } from "./inputhandler.ts";

test(// In production `PitchPipeline` only fires a PitchEvent when it has a stable
// new note. The handler must therefore forward every PitchEvent it sees,
// including the very first one — otherwise the UI indicator lags by one
// note (see PitchInputAdapter regression test).
"handler forwards each stable PitchEvent from the detector, without lookahead", async () => {
  const detector = new FakePitchDetector();
  const events: Array<{
    readonly type: "input";
    readonly timeStamp: number;
    readonly inputType: "appendChar";
    readonly codePoint: number;
    readonly timeToType: number;
  }> = [];
  const handler = new PitchInputHandler({
    createDetector: () => detector,
  });
  handler.setCallbacks({
    onInput: (event) => {
      events.push({
        type: event.type,
        timeStamp: event.timeStamp,
        inputType: event.inputType as "appendChar",
        codePoint: event.codePoint,
        timeToType: event.timeToType,
      });
    },
  });

  await handler.start();
  detector.emit({
    timeStamp: 120,
    midiNote: 60,
    frequency: 261.63,
    confidence: 0.95,
  });
  detector.emit({
    timeStamp: 250,
    midiNote: 64,
    frequency: 329.63,
    confidence: 0.95,
  });
  detector.emit({
    timeStamp: 320,
    midiNote: 67,
    frequency: 392,
    confidence: 0.95,
  });
  handler.stop();

  deepEqual(events, [
    {
      type: "input",
      timeStamp: 120,
      inputType: "appendChar",
      codePoint: 60,
      timeToType: 0,
    },
    {
      type: "input",
      timeStamp: 250,
      inputType: "appendChar",
      codePoint: 64,
      timeToType: 130,
    },
    {
      type: "input",
      timeStamp: 320,
      inputType: "appendChar",
      codePoint: 67,
      timeToType: 70,
    },
  ]);
});

test(// BEN-53: A music-lesson transition must not tear down the audio context,
// but it must clear the pipeline's emit-tracking state. Otherwise the first
// note of the next lesson is suppressed when it matches the last emitted
// note of the previous lesson.
"reset() flushes pipeline state without restarting the detector", async () => {
  const detector = new FakePitchDetector();
  const handler = new PitchInputHandler({
    createDetector: () => detector,
  });
  const events: Array<{ codePoint: number; timeToType: number }> = [];
  handler.setCallbacks({
    onInput: (event) => {
      events.push({
        codePoint: event.codePoint,
        timeToType: event.timeToType,
      });
    },
  });

  await handler.start();
  isTrue(detector.startCount === 1);

  detector.emit({
    timeStamp: 100,
    midiNote: 60,
    frequency: 261.63,
    confidence: 0.95,
  });

  handler.reset();

  // The detector must not be torn down or restarted: that would drop the
  // microphone permission and the audio context, freezing pitch input for
  // the multi-second media-stream re-acquire.
  isTrue(detector.startCount === 1);
  isTrue(detector.stopCount === 0);
  // The reset must propagate into the detector's pipeline so the processor
  // discards `#lastEmittedMidi` / `#released` / vote window.
  isTrue(detector.resetCount === 1);

  // After reset the adapter still routes pitch events to the consumer.
  detector.emit({
    timeStamp: 250,
    midiNote: 60,
    frequency: 261.63,
    confidence: 0.95,
  });

  // The adapter's `timeToType` baseline is also reset: the first event after
  // reset is treated as a fresh attack (timeToType === 0), not a continuation
  // of the previous timing.
  deepEqual(events, [
    { codePoint: 60, timeToType: 0 },
    { codePoint: 60, timeToType: 0 },
  ]);
  handler.stop();
});

class FakePitchDetector implements PitchDetector {
  onPitch: PitchDetector["onPitch"] = () => {};
  onLevel: PitchDetector["onLevel"] = () => {};

  startCount = 0;
  stopCount = 0;
  resetCount = 0;

  async start() {
    this.startCount += 1;
  }

  stop() {
    this.stopCount += 1;
  }

  reset() {
    this.resetCount += 1;
  }

  emit(event: PitchEvent) {
    this.onPitch(event);
  }
}
