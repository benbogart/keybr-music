import { test } from "node:test";
import { Layout } from "@keybr/keyboard";
import { LessonKey, LessonKeys } from "@keybr/lesson";
import { Letter } from "@keybr/phonetic-model";
import { Result, TextType } from "@keybr/result";
import { Histogram } from "@keybr/textinput";
import { equal } from "rich-assert";
import { makeMusicLessonSummary } from "./music-summary.ts";

test("build music lesson summary with labels and slowest note", () => {
  const c4 = new Letter(60, 0.34, "C4");
  const d4 = new Letter(62, 0.33, "D4");
  const e4 = new Letter(64, 0.33, "E4");
  const lessonKeys = new LessonKeys([
    createLessonKey(c4, true),
    createLessonKey(d4, true),
    createLessonKey(e4, false),
  ]);

  const result = new Result(
    Layout.BANDONEON,
    TextType.GENERATED,
    1000,
    12,
    6000,
    2,
    new Histogram([
      { codePoint: 60, hitCount: 4, missCount: 1, timeToType: 230 },
      { codePoint: 62, hitCount: 3, missCount: 1, timeToType: 500 },
      { codePoint: 64, hitCount: 2, missCount: 0, timeToType: 180 },
    ]),
  );

  const summary = makeMusicLessonSummary(result, lessonKeys, 240);
  const c4Note = summary.notes.find((note) => note.codePoint === 60);
  const e4Note = summary.notes.find((note) => note.codePoint === 64);

  equal(summary.notesPlayed, 9);
  equal(summary.slowestNote, "D4");
  equal(c4Note?.label, "C4");
  equal(c4Note?.atTargetSpeed, true);
  equal(e4Note?.inLesson, false);
});

function createLessonKey(letter: Letter, isIncluded: boolean): LessonKey {
  return new LessonKey({
    letter,
    samples: [],
    timeToType: null,
    bestTimeToType: null,
    confidence: null,
    bestConfidence: null,
    isIncluded,
  });
}
