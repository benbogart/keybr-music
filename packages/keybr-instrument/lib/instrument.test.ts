import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { deepEqual, equal } from "rich-assert";
import {
  bandoneonLeftClosingKeyPositions,
  bandoneonLeftOpeningKeyPositions,
  bandoneonRightClosingKeyPositions,
  bandoneonRightOpeningKeyPositions,
} from "./bandoneon-layout.ts";
import {
  bandoneon,
  bandoneonLeftClosing,
  bandoneonLeftOpening,
  BandoneonRange,
  bandoneonRightClosing,
  bandoneonRightOpening,
} from "./instrument.ts";

test("bandoneon defaults to right-opening layout", () => {
  const instrument = bandoneon();
  const expected = bandoneonRightOpening();

  equal(instrument.layout, "right-opening");
  equal(instrument.instrument, "bandoneon");
  equal(instrument.id, expected.id);
  equal(instrument.name, expected.name);
  deepEqual([...instrument.codePoints], [...expected.codePoints]);
});

test("bandoneon layout factories expose matching keymaps and ranges", () => {
  const rightOpening = bandoneonRightOpening();
  const rightClosing = bandoneonRightClosing();
  const leftOpening = bandoneonLeftOpening();
  const leftClosing = bandoneonLeftClosing();

  equal(rightOpening.layout, "right-opening");
  equal(rightOpening.keymap, bandoneonRightOpeningKeyPositions);
  deepEqual(rightOpening.notation, { clef: "treble", octaveShift: 0 });
  deepEqual(rightOpening.range, { minMidiNote: 57, maxMidiNote: 95 });

  equal(rightClosing.layout, "right-closing");
  equal(rightClosing.keymap, bandoneonRightClosingKeyPositions);
  deepEqual(rightClosing.notation, { clef: "treble", octaveShift: 0 });
  deepEqual(rightClosing.range, { minMidiNote: 57, maxMidiNote: 93 });

  equal(leftOpening.layout, "left-opening");
  equal(leftOpening.keymap, bandoneonLeftOpeningKeyPositions);
  deepEqual(leftOpening.notation, { clef: "bass", octaveShift: -12 });
  deepEqual(leftOpening.range, { minMidiNote: 36, maxMidiNote: 69 });

  equal(leftClosing.layout, "left-closing");
  equal(leftClosing.keymap, bandoneonLeftClosingKeyPositions);
  deepEqual(leftClosing.notation, { clef: "bass", octaveShift: -12 });
  deepEqual(leftClosing.range, { minMidiNote: 37, maxMidiNote: 71 });

  deepEqual(
    [...rightOpening.codePoints],
    [...rightOpening.keymap.keys()].sort((a, b) => a - b),
  );
  deepEqual(
    [...rightClosing.codePoints],
    [...rightClosing.keymap.keys()].sort((a, b) => a - b),
  );
  deepEqual(
    [...leftOpening.codePoints],
    [...leftOpening.keymap.keys()].sort((a, b) => a - b),
  );
  deepEqual(
    [...leftClosing.codePoints],
    [...leftClosing.keymap.keys()].sort((a, b) => a - b),
  );

  deepEqual(BandoneonRange, {
    minMidiNote: 36,
    maxMidiNote: 95,
  });
});

test("bandoneon creates note letters with expected labels", () => {
  const instrument = bandoneonRightOpening();
  equal(instrument.letters.length, 38);
  equal(instrument.letters[0]?.label, "A3");
  equal(instrument.letters[instrument.letters.length - 1]?.label, "B6");
  deepEqual(BandoneonRange, {
    minMidiNote: 36,
    maxMidiNote: 95,
  });
});

test("bandoneon note frequencies start with requested initial sequence", () => {
  const instrument = bandoneonRightOpening();
  const ordered = Letter.frequencyOrder(instrument.letters)
    .slice(0, 6)
    .map(({ codePoint }) => codePoint);

  deepEqual(ordered, [68, 69, 71, 72, 74, 76]);
});

test("left-hand layouts start one octave lower", () => {
  const instrument = bandoneonLeftOpening();
  const ordered = Letter.frequencyOrder(instrument.letters)
    .slice(0, 6)
    .map(({ codePoint }) => codePoint);

  deepEqual(ordered, [56, 57, 59, 60, 62, 64]);
});

test("bandoneon exposes expected weighted MIDI code points", () => {
  const instrument = bandoneonLeftClosing();
  const expected = [...instrument.keymap.keys()].sort((a, b) => a - b);

  deepEqual([...instrument.codePoints], expected);
  equal(instrument.codePoints.size, expected.length);

  for (const midiNote of expected) {
    equal(instrument.codePoints.has(midiNote), true);
    equal(instrument.codePoints.weight(midiNote), 1);
  }
  equal(instrument.codePoints.has(36), false);
  equal(instrument.codePoints.weight(36), 1000);
});

test("Letter helpers work with note letters", () => {
  const instrument = bandoneonRightOpening();

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
    [...instrument.letters, new Letter(94, 1 / 38, "A#6")],
    instrument.codePoints,
  );
  deepEqual(restricted, instrument.letters);
});
