import { type WeightedCodePointSet } from "@keybr/keyboard";
import { Letter } from "@keybr/phonetic-model";
import { type CodePoint } from "@keybr/unicode";
import {
  bandoneonLeftClosingKeyPositions,
  bandoneonLeftOpeningKeyPositions,
  bandoneonRightClosingKeyPositions,
  bandoneonRightOpeningKeyPositions,
  type KeyPosition,
} from "./bandoneon-layout.ts";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const BANDONEON_INITIAL_MIDI_NOTE = 69; // A4
const BANDONEON_INITIAL_SEQUENCE = [68, 69, 71, 72, 74, 76] as const;
const BANDONEON_LEFT_HAND_INITIAL_MIDI_NOTE = 57; // A3
const BANDONEON_LEFT_HAND_INITIAL_SEQUENCE = [56, 57, 59, 60, 62, 64] as const;

export const BANDONEON_INSTRUMENT = "bandoneon";

export const BANDONEON_LAYOUTS = [
  "right-opening",
  "right-closing",
  "left-opening",
  "left-closing",
] as const;

export type BandoneonLayout = (typeof BANDONEON_LAYOUTS)[number];

export type NoteRange = {
  readonly minMidiNote: CodePoint;
  readonly maxMidiNote: CodePoint;
};

export type KeyMap = ReadonlyMap<CodePoint, KeyPosition>;

export type MusicNotation = {
  readonly clef: "treble" | "bass" | "grand";
  readonly octaveShift: number;
};

export type Instrument = {
  readonly id: string;
  readonly name: string;
  readonly instrument: string;
  readonly layout: string;
  readonly notation: MusicNotation;
  readonly range: NoteRange;
  readonly keymap: KeyMap;
  readonly letters: readonly Letter[];
  readonly codePoints: WeightedCodePointSet;
};

export function bandoneonRightOpening(): Instrument {
  return createBandoneonInstrument(
    "right-opening",
    "Bandoneon - Right Hand Opening",
    bandoneonRightOpeningKeyPositions,
  );
}

export function bandoneonRightClosing(): Instrument {
  return createBandoneonInstrument(
    "right-closing",
    "Bandoneon - Right Hand Closing",
    bandoneonRightClosingKeyPositions,
  );
}

export function bandoneonLeftOpening(): Instrument {
  return createBandoneonInstrument(
    "left-opening",
    "Bandoneon - Left Hand Opening",
    bandoneonLeftOpeningKeyPositions,
  );
}

export function bandoneonLeftClosing(): Instrument {
  return createBandoneonInstrument(
    "left-closing",
    "Bandoneon - Left Hand Closing",
    bandoneonLeftClosingKeyPositions,
  );
}

export function bandoneonByLayout(layout: string): Instrument {
  switch (layout) {
    case "right-opening":
      return bandoneonRightOpening();
    case "right-closing":
      return bandoneonRightClosing();
    case "left-opening":
      return bandoneonLeftOpening();
    case "left-closing":
      return bandoneonLeftClosing();
    default:
      return bandoneonRightOpening();
  }
}

export function bandoneon(): Instrument {
  return bandoneonRightOpening();
}

export const BandoneonRange = {
  minMidiNote: 36,
  maxMidiNote: 95,
} as const;

function createBandoneonInstrument(
  layout: BandoneonLayout,
  name: string,
  keymap: KeyMap,
): Instrument {
  const notes = sortedCodePoints(keymap.keys());
  const range = noteRange(notes);
  const initialProfile =
    layout === "left-opening" || layout === "left-closing"
      ? {
          sequence: BANDONEON_LEFT_HAND_INITIAL_SEQUENCE,
          start: BANDONEON_LEFT_HAND_INITIAL_MIDI_NOTE,
        }
      : {
          sequence: BANDONEON_INITIAL_SEQUENCE,
          start: BANDONEON_INITIAL_MIDI_NOTE,
        };
  const frequencies = prioritizedNoteFrequencies(
    notes,
    initialProfile.sequence,
    initialProfile.start,
  );
  const letters = notes.map(
    (midiNote, index) =>
      new Letter(midiNote, frequencies[index] ?? 0, midiNoteToLabel(midiNote)),
  );
  return {
    id: `${BANDONEON_INSTRUMENT}-${layout}`,
    name,
    instrument: BANDONEON_INSTRUMENT,
    layout,
    notation:
      layout === "left-opening" || layout === "left-closing"
        ? { clef: "bass", octaveShift: -12 }
        : { clef: "treble", octaveShift: 0 },
    range,
    keymap,
    letters,
    codePoints: uniformWeightedCodePointSet(notes),
  };
}

function sortedCodePoints(codePoints: Iterable<CodePoint>): CodePoint[] {
  return [...new Set(codePoints)].sort((a, b) => a - b);
}

function noteRange(notes: readonly CodePoint[]): NoteRange {
  const minMidiNote = notes[0];
  const maxMidiNote = notes[notes.length - 1];
  if (minMidiNote == null || maxMidiNote == null) {
    throw new Error("Bandoneon keymap must include at least one note");
  }
  return {
    minMidiNote,
    maxMidiNote,
  };
}

function prioritizedNoteFrequencies(
  notes: readonly CodePoint[],
  sequence: readonly CodePoint[],
  start: number,
): number[] {
  if (notes.length === 0) {
    return [];
  }
  const noteSet = new Set(notes);
  const preferred = sequence.filter((note) => noteSet.has(note));
  const preferredSet = new Set(preferred);
  const orderedNotes = [
    ...preferred,
    ...notes
      .filter((note) => note >= start && !preferredSet.has(note))
      .sort((a, b) => a - b),
    ...notes
      .filter((note) => note < start && !preferredSet.has(note))
      .sort((a, b) => b - a),
  ];
  const weightByNote = new Map<CodePoint, number>(
    orderedNotes.map((note, index) => [note, orderedNotes.length - index]),
  );
  const weights = notes.map((note) => weightByNote.get(note) ?? 0);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (total > 0 ? weight / total : 0));
}

function midiNoteToLabel(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTE_NAMES[midiNote % NOTE_NAMES.length];
  return `${noteName}${octave}`;
}

function uniformWeightedCodePointSet(
  codePointList: readonly CodePoint[],
): WeightedCodePointSet {
  const codePoints = new Set(codePointList);
  return new (class implements WeightedCodePointSet {
    [Symbol.iterator](): IterableIterator<CodePoint> {
      return codePoints[Symbol.iterator]();
    }

    get size(): number {
      return codePoints.size;
    }

    has(codePoint: CodePoint): boolean {
      return codePoints.has(codePoint);
    }

    weight(codePoint: CodePoint): number {
      return this.has(codePoint) ? 1 : 1000;
    }
  })();
}
