import { test } from "node:test";
import { bandoneonLeftOpening, NoteSequenceModel } from "@keybr/instrument";
import { MusicLesson } from "@keybr/lesson";
import { Settings } from "@keybr/settings";
import { Feedback } from "@keybr/textinput";
import { equal } from "rich-assert";
import { LessonState } from "./lesson-state.ts";
import { Progress } from "./progress.ts";

test("music lesson ignores notes outside instrument code points", () => {
  const settings = new Settings();
  const instrument = bandoneonLeftOpening();
  const lesson = new MusicLesson(
    settings,
    instrument,
    new NoteSequenceModel(instrument.codePoints),
  );
  const progress = new Progress(settings, lesson);
  const state = new LessonState(progress, () => {});

  const expectedCodePoint = state.suffix[0];
  if (expectedCodePoint == null) {
    throw new Error("Expected non-empty generated lesson text");
  }

  // B1 is outside left-hand opening instrument code points.
  equal(instrument.codePoints.has(35), false);

  const invalidFeedback = state.onInput({
    timeStamp: 100,
    inputType: "appendChar",
    codePoint: 35,
    timeToType: 0,
  });
  equal(invalidFeedback, Feedback.Succeeded);
  equal(state.textInput.pos, 0);
  equal(state.suffix[0], expectedCodePoint);

  const validFeedback = state.onInput({
    timeStamp: 200,
    inputType: "appendChar",
    codePoint: expectedCodePoint,
    timeToType: 0,
  });
  equal(validFeedback === Feedback.Failed, false);
  equal(state.textInput.pos > 0, true);
});
