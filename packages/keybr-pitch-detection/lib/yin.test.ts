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

test("YIN harmonic descent recovers fundamental when harmonics dominate first dip", () => {
  const fundamentalHz = 220;
  const analyzer = new YinPitchAnalyzer(4096, {
    minFrequency: 80,
    maxFrequency: 1200,
  });
  const signal = harmonicRichWave(fundamentalHz, 4096, SAMPLE_RATE);

  const pitch = analyzer.detect(signal, SAMPLE_RATE);

  isNotNull(pitch);
  if (pitch == null) {
    return;
  }
  isTrue(Math.abs(pitch.frequency - fundamentalHz) < 4);
  equal(frequencyToMidiNote(pitch.frequency), 57);
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

/** Strong upper partials so YIN's first sub-threshold dip can sit at a harmonic, not the fundamental. */
function harmonicRichWave(
  fundamentalHz: number,
  length: number,
  sampleRate: number,
): Float32Array {
  const result = new Float32Array(length);
  for (let i = 0; i < result.length; i += 1) {
    const t = (2 * Math.PI * fundamentalHz * i) / sampleRate;
    result[i] =
      0.25 * Math.sin(t) +
      0.95 * Math.sin(2 * t) +
      0.7 * Math.sin(3 * t) +
      0.45 * Math.sin(4 * t);
  }
  return result;
}
