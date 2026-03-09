import { type Filter } from "@keybr/phonetic-model";
import { type RNG } from "@keybr/rand";
import { type CodePoint } from "@keybr/unicode";

export const NOTE_SEQUENCE_MIN_LENGTH = 3;
export const NOTE_SEQUENCE_MAX_LENGTH = 8;

type Pattern = "run" | "neighbor" | "random";

export class NoteSequenceModel {
  readonly codePoints: readonly CodePoint[];
  readonly codePointSet: ReadonlySet<CodePoint>;

  constructor(codePoints: Iterable<CodePoint>) {
    this.codePoints = sortCodePoints(codePoints);
    this.codePointSet = new Set(this.codePoints);
  }

  nextWord(filter: Filter, random: RNG = Math.random): string {
    const includedCodePoints = this.resolveIncludedCodePoints(filter);
    if (includedCodePoints.length === 0) {
      return "";
    }

    const focusedCodePoint = this.resolveFocusedCodePoint(
      filter.focusedCodePoint,
      includedCodePoints,
    );
    const includeFocused =
      focusedCodePoint != null &&
      (includedCodePoints.length === 1 || random() < 0.5);
    const length = randomInt(
      NOTE_SEQUENCE_MIN_LENGTH,
      NOTE_SEQUENCE_MAX_LENGTH,
      random,
    );

    let sequence = this.generateSequence(
      includedCodePoints,
      focusedCodePoint,
      includeFocused,
      length,
      random,
    );
    sequence = ensureLength(sequence, length, includedCodePoints, random);
    sequence = ensureNoRepeatedAdjacent(sequence, includedCodePoints, random);

    if (includeFocused && focusedCodePoint != null) {
      sequence = ensureFocusedIncluded(sequence, focusedCodePoint, random);
      sequence = ensureNoRepeatedAdjacent(sequence, includedCodePoints, random);
    }

    return String.fromCodePoint(...sequence);
  }

  private resolveIncludedCodePoints(filter: Filter): CodePoint[] {
    const codePoints =
      filter.codePoints == null
        ? this.codePoints
        : [...filter.codePoints].filter((codePoint) =>
            this.codePointSet.has(codePoint),
          );
    return sortCodePoints(codePoints);
  }

  private resolveFocusedCodePoint(
    focusedCodePoint: CodePoint | null,
    includedCodePoints: readonly CodePoint[],
  ): CodePoint | null {
    if (
      focusedCodePoint != null &&
      includedCodePoints.includes(focusedCodePoint)
    ) {
      return focusedCodePoint;
    } else {
      return null;
    }
  }

  private generateSequence(
    includedCodePoints: readonly CodePoint[],
    focusedCodePoint: CodePoint | null,
    includeFocused: boolean,
    length: number,
    random: RNG,
  ): CodePoint[] {
    const codePointsWithoutFocused =
      focusedCodePoint == null
        ? includedCodePoints
        : includedCodePoints.filter(
            (codePoint) => codePoint !== focusedCodePoint,
          );
    const generationCodePoints =
      includeFocused || codePointsWithoutFocused.length === 0
        ? includedCodePoints
        : codePointsWithoutFocused;
    const pattern = randomPattern(
      includedCodePoints,
      focusedCodePoint,
      includeFocused,
      random,
    );

    switch (pattern) {
      case "run":
        return generateRun(generationCodePoints, length, random);
      case "neighbor":
        return generateNeighborPattern(
          includedCodePoints,
          focusedCodePoint!,
          length,
          random,
        );
      case "random":
        return generateRandomPattern(generationCodePoints, length, random);
    }
  }
}

const randomPattern = (
  includedCodePoints: readonly CodePoint[],
  focusedCodePoint: CodePoint | null,
  includeFocused: boolean,
  random: RNG,
): Pattern => {
  const patterns: Pattern[] = ["run", "random"];
  if (
    includeFocused &&
    focusedCodePoint != null &&
    includedCodePoints.length > 1
  ) {
    patterns.push("neighbor");
  }
  return sample(patterns, random);
};

const generateRun = (
  codePoints: readonly CodePoint[],
  length: number,
  random: RNG,
): CodePoint[] => {
  if (codePoints.length === 0) {
    return [];
  }
  if (codePoints.length === 1) {
    return Array.from({ length }, () => codePoints[0]);
  }

  const sequence: CodePoint[] = [];
  let index = randomIndex(codePoints.length, random);
  let direction = random() < 0.5 ? 1 : -1;
  for (let i = 0; i < length; i++) {
    sequence.push(codePoints[index]);
    let next = index + direction;
    if (next < 0 || next >= codePoints.length) {
      direction *= -1;
      next = index + direction;
    }
    index = next;
  }
  return sequence;
};

const generateNeighborPattern = (
  includedCodePoints: readonly CodePoint[],
  focusedCodePoint: CodePoint,
  length: number,
  random: RNG,
): CodePoint[] => {
  const index = includedCodePoints.indexOf(focusedCodePoint);
  if (index < 0) {
    return generateRandomPattern(includedCodePoints, length, random);
  }

  const neighbors: CodePoint[] = [focusedCodePoint];
  if (index > 0) {
    neighbors.push(includedCodePoints[index - 1]);
  }
  if (index + 1 < includedCodePoints.length) {
    neighbors.push(includedCodePoints[index + 1]);
  }

  const sequence: CodePoint[] = [];
  while (sequence.length < length) {
    sequence.push(
      sampleExcludingAdjacent(
        neighbors,
        sequence[sequence.length - 1] ?? null,
        null,
        random,
      ),
    );
  }
  return sequence;
};

const generateRandomPattern = (
  codePoints: readonly CodePoint[],
  length: number,
  random: RNG,
): CodePoint[] => {
  if (codePoints.length === 0) {
    return [];
  }

  const sequence: CodePoint[] = [];
  while (sequence.length < length) {
    sequence.push(
      sampleExcludingAdjacent(
        codePoints,
        sequence[sequence.length - 1] ?? null,
        null,
        random,
      ),
    );
  }
  return sequence;
};

const ensureLength = (
  sequence: readonly CodePoint[],
  length: number,
  codePoints: readonly CodePoint[],
  random: RNG,
): CodePoint[] => {
  if (sequence.length > length) {
    return sequence.slice(0, length);
  }
  if (sequence.length === length) {
    return [...sequence];
  }
  const result = [...sequence];
  while (result.length < length) {
    result.push(
      sampleExcludingAdjacent(
        codePoints,
        result[result.length - 1] ?? null,
        null,
        random,
      ),
    );
  }
  return result;
};

const ensureFocusedIncluded = (
  sequence: readonly CodePoint[],
  focusedCodePoint: CodePoint,
  random: RNG,
): CodePoint[] => {
  if (sequence.includes(focusedCodePoint)) {
    return [...sequence];
  }
  const result = [...sequence];
  const index = randomIndex(result.length, random);
  result[index] = focusedCodePoint;
  return result;
};

const ensureNoRepeatedAdjacent = (
  sequence: readonly CodePoint[],
  codePoints: readonly CodePoint[],
  random: RNG,
): CodePoint[] => {
  if (codePoints.length <= 1) {
    return [...sequence];
  }
  const result = [...sequence];
  for (let i = 1; i < result.length; i++) {
    if (result[i] === result[i - 1]) {
      result[i] = sampleExcludingAdjacent(
        codePoints,
        result[i - 1],
        result[i + 1] ?? null,
        random,
      );
    }
  }
  return result;
};

const sampleExcludingAdjacent = (
  codePoints: readonly CodePoint[],
  left: CodePoint | null,
  right: CodePoint | null,
  random: RNG,
): CodePoint => {
  const excludingBoth = codePoints.filter(
    (codePoint) => codePoint !== left && codePoint !== right,
  );
  if (excludingBoth.length > 0) {
    return sample(excludingBoth, random);
  }
  const excludingLeft = codePoints.filter((codePoint) => codePoint !== left);
  if (excludingLeft.length > 0) {
    return sample(excludingLeft, random);
  }
  return sample(codePoints, random);
};

const sample = <T>(list: readonly T[], random: RNG): T => {
  if (list.length === 0) {
    throw new Error();
  }
  return list[randomIndex(list.length, random)];
};

const randomIndex = (length: number, random: RNG): number => {
  return (random() * length) | 0;
};

const randomInt = (min: number, max: number, random: RNG): number => {
  return min + randomIndex(max - min + 1, random);
};

const sortCodePoints = (codePoints: Iterable<CodePoint>): CodePoint[] => {
  return [...new Set(codePoints)].sort((a, b) => a - b);
};
