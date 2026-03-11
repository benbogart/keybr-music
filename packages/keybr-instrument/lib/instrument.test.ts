import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { deepEqual, equal } from "rich-assert";
import { bandoneon, BandoneonRange } from "./instrument.ts";

test("bandoneon creates note letters in C4-B4 range with expected labels", () => {
  const instrument = bandoneon();

  equal(instrument.id, "bandoneon");
  equal(instrument.name, "Bandoneon");
  equal(instrument.letters.length, 12);
  equal(instrument.letters[0]?.f, 1 / 72);
  equal(instrument.letters[9]?.f, 10 / 72);

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
    ],
  );

  deepEqual(BandoneonRange, {
    minMidiNote: 45,
    maxMidiNote: 93,
    pocMinMidiNote: 60,
    pocMaxMidiNote: 71,
  });
});

test("bandoneon note frequencies are centered around A4", () => {
  const instrument = bandoneon();
  const ordered = Letter.frequencyOrder(instrument.letters)
    .slice(0, 6)
    .map(({ codePoint }) => codePoint);

  deepEqual(ordered, [69, 68, 70, 67, 71, 66]);
});

test("bandoneon exposes expected weighted MIDI code points", () => {
  const instrument = bandoneon();
  const expected = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

  deepEqual([...instrument.codePoints], expected);
  equal(instrument.codePoints.size, expected.length);

  for (const midiNote of expected) {
    equal(instrument.codePoints.has(midiNote), true);
    equal(instrument.codePoints.weight(midiNote), 1);
  }
  equal(instrument.codePoints.has(72), false);
  equal(instrument.codePoints.weight(72), 1000);
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
    [...instrument.letters, new Letter(72, 1 / 12, "C5")],
    instrument.codePoints,
  );
  deepEqual(restricted, instrument.letters);
});
