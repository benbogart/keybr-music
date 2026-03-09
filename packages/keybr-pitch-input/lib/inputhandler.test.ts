import { test } from "node:test";
import { type PitchDetector, type PitchEvent } from "@keybr/pitch-detection";
import { deepEqual } from "rich-assert";
import { PitchInputHandler } from "./inputhandler.ts";

test("handler emits expected input stream from detector pitch sequence", async () => {
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
    timeStamp: 100,
    midiNote: 72,
    frequency: 523.25,
    confidence: 0.95,
  });
  detector.emit({
    timeStamp: 120,
    midiNote: 60,
    frequency: 261.63,
    confidence: 0.95,
  });
  detector.emit({
    timeStamp: 170,
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
    timeStamp: 290,
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
  detector.emit({
    timeStamp: 360,
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

class FakePitchDetector implements PitchDetector {
  onPitch: PitchDetector["onPitch"] = () => {};
  onLevel: PitchDetector["onLevel"] = () => {};

  async start() {}

  stop() {}

  emit(event: PitchEvent) {
    this.onPitch(event);
  }
}
