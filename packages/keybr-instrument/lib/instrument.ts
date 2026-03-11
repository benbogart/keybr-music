import { type WeightedCodePointSet } from "@keybr/keyboard";
import { Letter } from "@keybr/phonetic-model";
import { type CodePoint } from "@keybr/unicode";

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

const BANDONEON_MIN_MIDI_NOTE = 45; // A2
const BANDONEON_MAX_MIDI_NOTE = 93; // A6
const BANDONEON_POC_MIN_MIDI_NOTE = 60; // C4
const BANDONEON_POC_MAX_MIDI_NOTE = 71; // B4
const BANDONEON_REFERENCE_MIDI_NOTE = 69; // A4

export type Instrument = {
  readonly id: string;
  readonly name: string;
  readonly letters: readonly Letter[];
  readonly codePoints: WeightedCodePointSet;
};

export function bandoneon(): Instrument {
  const notes = midiRange(
    BANDONEON_POC_MIN_MIDI_NOTE,
    BANDONEON_POC_MAX_MIDI_NOTE,
  );
  const frequencies = centerOutFrequencies(
    notes,
    BANDONEON_REFERENCE_MIDI_NOTE,
  );
  const letters = notes.map(
    (midiNote, index) =>
      new Letter(midiNote, frequencies[index] ?? 0, midiNoteToLabel(midiNote)),
  );
  return {
    id: "bandoneon",
    name: "Bandoneon",
    letters,
    codePoints: uniformWeightedCodePointSet(notes),
  };
}

export const BandoneonRange = {
  minMidiNote: BANDONEON_MIN_MIDI_NOTE,
  maxMidiNote: BANDONEON_MAX_MIDI_NOTE,
  pocMinMidiNote: BANDONEON_POC_MIN_MIDI_NOTE,
  pocMaxMidiNote: BANDONEON_POC_MAX_MIDI_NOTE,
} as const;

function midiRange(begin: number, end: number): CodePoint[] {
  const notes: CodePoint[] = [];
  for (let note = begin; note <= end; note++) {
    notes.push(note);
  }
  return notes;
}

function centerOutFrequencies(
  notes: readonly CodePoint[],
  center: number,
): number[] {
  if (notes.length === 0) {
    return [];
  }
  const distances = notes.map((note) => Math.abs(note - center));
  const maxDistance = Math.max(...distances);
  const weights = distances.map((distance) => maxDistance - distance + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
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
