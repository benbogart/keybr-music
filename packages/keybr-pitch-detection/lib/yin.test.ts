import { test } from "node:test";
import { equal, isNotNull, isTrue } from "rich-assert";
import { frequencyToMidiNote } from "./midi.ts";
import { YinPitchAnalyzer } from "./yin.ts";

const SAMPLE_RATE = 44_100;

test("YIN detects expected MIDI note from sine wave", () => {
  const frequency = 440;
  const analyzer = new YinPitchAnalyzer(4096, {
    minFrequency: 80,
    maxFrequency: 1000,
  });
  const signal = sineWave(frequency, 4096, SAMPLE_RATE);

  const pitch = analyzer.detect(signal, SAMPLE_RATE);

  isNotNull(pitch);
  if (pitch == null) {
    return;
  }
  isTrue(Math.abs(pitch.frequency - frequency) < 2);
  equal(frequencyToMidiNote(pitch.frequency), 69);
});

function sineWave(
  frequency: number,
  length: number,
  sampleRate: number,
): Float32Array {
  const result = new Float32Array(length);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return result;
}
