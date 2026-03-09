import { test } from "node:test";
import { Filter, Letter } from "@keybr/phonetic-model";
import { LCG } from "@keybr/rand";
import { codePointLength, toCodePoints } from "@keybr/unicode";
import { isTrue } from "rich-assert";
import {
  NOTE_SEQUENCE_MAX_LENGTH,
  NOTE_SEQUENCE_MIN_LENGTH,
  NoteSequenceModel,
} from "./notesequencemodel.ts";

const noteLetters = (notes: readonly number[]): Letter[] => {
  const f = notes.length > 0 ? 1 / notes.length : 0;
  return notes.map((note) => new Letter(note, f, `N${note}`));
};

test("generated sequences contain only included notes", () => {
  const notes = [60, 61, 62, 63, 64, 65];
  const letters = noteLetters(notes);
  const filter = new Filter(letters, null);
  const model = new NoteSequenceModel([45, 46, ...notes, 90, 91]);
  const rng = LCG(17);

  for (let i = 0; i < 200; i++) {
    const sequence = model.nextWord(filter, rng);
    for (const codePoint of toCodePoints(sequence)) {
      isTrue(filter.codePoints!.has(codePoint));
    }
  }
});

test("focused note appears with expected frequency", () => {
  const notes = [60, 61, 62, 63, 64, 65, 66, 67];
  const letters = noteLetters(notes);
  const focused = letters[3];
  const filter = new Filter(letters, focused);
  const model = new NoteSequenceModel(notes);
  const rng = LCG(913);

  const attempts = 2000;
  let withFocused = 0;
  for (let i = 0; i < attempts; i++) {
    const sequence = model.nextWord(filter, rng);
    if (Array.from(toCodePoints(sequence)).includes(focused.codePoint)) {
      withFocused++;
    }
  }

  const ratio = withFocused / attempts;
  isTrue(ratio > 0.4 && ratio < 0.6);
});

test("generated sequences have lengths within expected bounds", () => {
  const notes = [60, 61, 62, 63, 64, 65];
  const letters = noteLetters(notes);
  const filter = new Filter(letters, null);
  const model = new NoteSequenceModel(notes);
  const rng = LCG(1234);

  for (let i = 0; i < 500; i++) {
    const sequence = model.nextWord(filter, rng);
    const length = codePointLength(sequence);
    isTrue(
      length >= NOTE_SEQUENCE_MIN_LENGTH && length <= NOTE_SEQUENCE_MAX_LENGTH,
    );
  }
});

test("generated sequences do not repeat adjacent notes", () => {
  const notes = [60, 61, 62, 63, 64];
  const letters = noteLetters(notes);
  const filter = new Filter(letters, letters[2]);
  const model = new NoteSequenceModel(notes);
  const rng = LCG(3199);

  for (let i = 0; i < 500; i++) {
    const sequence = Array.from(toCodePoints(model.nextWord(filter, rng)));
    for (let j = 1; j < sequence.length; j++) {
      isTrue(sequence[j] !== sequence[j - 1]);
    }
  }
});
