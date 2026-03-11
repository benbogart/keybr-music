import { test } from "node:test";
import { bandoneon, NoteSequenceModel } from "@keybr/instrument";
import { type KeyStats, type KeyStatsMap } from "@keybr/result";
import { Settings } from "@keybr/settings";
import { deepEqual, equal } from "rich-assert";
import { MusicLesson } from "./music.ts";
import { lessonProps } from "./settings.ts";

test("focuses the slowest included note", () => {
  const instrument = bandoneon();
  const settings = new Settings().set(lessonProps.guided.alphabetSize, 0);
  const lesson = new MusicLesson(
    settings,
    instrument,
    new NoteSequenceModel(instrument.codePoints),
  );
  const [n1, n2, n3, n4, n5, n6] = [69, 70, 71, 72, 73, 74].map(
    (codePoint) =>
      lesson.letters.find((letter) => letter.codePoint === codePoint)!,
  );
  const keyStatsMap = makeKeyStatsMapWithTimes(lesson.letters, [
    [n1.codePoint, 300],
    [n2.codePoint, 220],
    [n3.codePoint, 420],
    [n4.codePoint, 260],
    [n5.codePoint, 280],
    [n6.codePoint, 240],
  ]);

  const lessonKeys = lesson.update(keyStatsMap);

  equal(lessonKeys.findIncludedKeys().length, 6);
  equal(lessonKeys.findFocusedKey()?.letter.codePoint, n3.codePoint);
});

test("starts with an A4-to-D5 initial note pool", () => {
  const instrument = bandoneon();
  const settings = new Settings().set(lessonProps.guided.alphabetSize, 0);
  const lesson = new MusicLesson(
    settings,
    instrument,
    new NoteSequenceModel(instrument.codePoints),
  );
  const lessonKeys = lesson.update(
    makeKeyStatsMapWithTimes(lesson.letters, []),
  );
  const includedCodePoints = lessonKeys
    .findIncludedKeys()
    .map(({ letter }) => letter.codePoint);

  deepEqual(includedCodePoints, [69, 70, 71, 72, 73, 74]);
});

function makeKeyStatsMapWithTimes(
  letters: readonly KeyStats["letter"][],
  timeByCodePoint: readonly [codePoint: number, timeToType: number][],
): KeyStatsMap {
  const timeToTypeMap = new Map(timeByCodePoint);
  const map = new Map<KeyStats["letter"], KeyStats>(
    letters.map((letter) => {
      const timeToType = timeToTypeMap.get(letter.codePoint) ?? null;
      return [
        letter,
        {
          letter,
          samples: [],
          timeToType,
          bestTimeToType: timeToType,
        } satisfies KeyStats,
      ];
    }),
  );
  return {
    letters: [...letters],
    results: [],
    get: (letter) => map.get(letter)!,
    [Symbol.iterator]: () => map.values(),
  };
}
