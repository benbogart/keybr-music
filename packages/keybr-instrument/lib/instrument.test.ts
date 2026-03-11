import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { deepEqual, equal } from "rich-assert";
import { bandoneon, BandoneonRange } from "./instrument.ts";

test("bandoneon creates note letters in C4-D5 range with expected labels", () => {
  const instrument = bandoneon();

  equal(instrument.id, "bandoneon");
  equal(instrument.name, "Bandoneon");
  equal(instrument.letters.length, 15);
  equal(instrument.letters[0]?.f, 1 / 120);
  equal(instrument.letters[9]?.f, 15 / 120);

  deepEqual(
    instrument.letters.map(({ codePoint, label }) => [codePoint, label]),
    [
      [60, "C4"],
      [61, "C#4"],
      [62, "D4"],
      [63, "D#4"],
      [64, "E4"],
      [65, "F4"],
      [66, "F#4"],
      [67, "G4"],
      [68, "G#4"],
      [69, "A4"],
      [70, "A#4"],
      [71, "B4"],
      [72, "C5"],
      [73, "C#5"],
      [74, "D5"],
    ],
  );

  deepEqual(BandoneonRange, {
    minMidiNote: 45,
    maxMidiNote: 93,
    pocMinMidiNote: 60,
    pocMaxMidiNote: 74,
  });
});

test("bandoneon note frequencies start at A4 and rise", () => {
  const instrument = bandoneon();
  const ordered = Letter.frequencyOrder(instrument.letters)
    .slice(0, 6)
    .map(({ codePoint }) => codePoint);

  deepEqual(ordered, [69, 70, 71, 72, 73, 74]);
});

test("bandoneon exposes expected weighted MIDI code points", () => {
  const instrument = bandoneon();
  const expected = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74];

  deepEqual([...instrument.codePoints], expected);
  equal(instrument.codePoints.size, expected.length);

  for (const midiNote of expected) {
    equal(instrument.codePoints.has(midiNote), true);
    equal(instrument.codePoints.weight(midiNote), 1);
  }
  equal(instrument.codePoints.has(75), false);
  equal(instrument.codePoints.weight(75), 1000);
});

test("Letter helpers work with note letters", () => {
  const instrument = bandoneon();

  deepEqual(
    Letter.frequencyOrder([
      new Letter(62, 0.2, "D4"),
      new Letter(60, 0.2, "C4"),
      new Letter(61, 0.6, "C#4"),
    ]).map(({ codePoint, label }) => [codePoint, label]),
    [
      [61, "C#4"],
      [60, "C4"],
      [62, "D4"],
    ],
  );

  const restricted = Letter.restrict(
    [...instrument.letters, new Letter(75, 1 / 15, "D#5")],
    instrument.codePoints,
  );
  deepEqual(restricted, instrument.letters);
});
