const MIDI_NOTE_MIN = 0;
const MIDI_NOTE_MAX = 127;

export function frequencyToMidiNote(frequency: number): number {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return MIDI_NOTE_MIN;
  }
  const note = Math.round(69 + 12 * Math.log2(frequency / 440));
  return Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, note));
}
