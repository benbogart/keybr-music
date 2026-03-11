import { type CodePoint } from "@keybr/unicode";

export type KeyPosition = {
  readonly x: number;
  readonly y: number;
};

// Right-hand viewBox (shared by opening and closing; same physical buttons)
export const RIGHT_HAND_VIEWBOX = "0 0 460.38 243.55";
// Left-hand viewBox (shared by opening and closing; same physical buttons)
export const LEFT_HAND_VIEWBOX = "0 0 225.99 452.0";

/** @deprecated Use RIGHT_HAND_VIEWBOX */
export const SVG_VIEWBOX = RIGHT_HAND_VIEWBOX;

/**
 * Right-hand opening layout: MIDI note -> button position.
 * 38 keys, A3 (57) to B6 (95). Missing chromatic note: A#6 (94).
 */
export const bandoneonRightOpeningKeyPositions = new Map<
  CodePoint,
  KeyPosition
>([
  [57, { x: 24.0, y: 177.55 }],
  [58, { x: 53.59, y: 210.55 }],
  [59, { x: 47.08, y: 138.03 }],
  [60, { x: 75.69, y: 95.66 }],
  [61, { x: 100.24, y: 63.41 }],
  [62, { x: 131.64, y: 90.31 }],
  [63, { x: 108.72, y: 197.8 }],
  [64, { x: 105.04, y: 127.71 }],
  [65, { x: 79.93, y: 165.15 }],
  [66, { x: 224.17, y: 118.71 }],
  [67, { x: 192.56, y: 84.16 }],
  [68, { x: 189.73, y: 156.03 }],
  [69, { x: 281.27, y: 122.38 }],
  [70, { x: 134.42, y: 159.55 }],
  [71, { x: 245.7, y: 153.96 }],
  [72, { x: 344.37, y: 127.71 }],
  [73, { x: 163.73, y: 122.38 }],
  [74, { x: 308.13, y: 153.96 }],
  [75, { x: 218.11, y: 186.55 }],
  [76, { x: 399.99, y: 140.38 }],
  [77, { x: 163.73, y: 189.78 }],
  [78, { x: 275.93, y: 187.3 }],
  [79, { x: 436.38, y: 219.55 }],
  [80, { x: 363.91, y: 165.15 }],
  [81, { x: 331.41, y: 192.55 }],
  [82, { x: 256.99, y: 84.88 }],
  [83, { x: 423.66, y: 177.55 }],
  [84, { x: 316.96, y: 93.16 }],
  [85, { x: 384.41, y: 201.55 }],
  [86, { x: 376.93, y: 102.88 }],
  [87, { x: 349.71, y: 66.88 }],
  [88, { x: 296.0, y: 55.5 }],
  [89, { x: 329.99, y: 30.13 }],
  [90, { x: 224.17, y: 55.5 }],
  [91, { x: 264.2, y: 25.62 }],
  [92, { x: 194.22, y: 24.0 }],
  [93, { x: 159.0, y: 55.63 }],
  [95, { x: 131.17, y: 28.45 }],
]);

/** @deprecated Use bandoneonRightOpeningKeyPositions */
export const bandoneonKeyPositions = bandoneonRightOpeningKeyPositions;

/**
 * Right-hand closing layout: MIDI note -> button position.
 * 38 keys, A3 (57) to A6 (93). Missing chromatic notes: A#6 (94), B6 (95).
 * Same physical buttons as right-opening, different note assignments.
 */
export const bandoneonRightClosingKeyPositions = new Map<
  CodePoint,
  KeyPosition
>([
  [57, { x: 24.0, y: 177.55 }],
  [58, { x: 53.59, y: 210.55 }],
  [59, { x: 47.08, y: 138.03 }],
  [60, { x: 100.24, y: 63.41 }],
  [61, { x: 131.64, y: 90.31 }],
  [62, { x: 75.69, y: 95.66 }],
  [63, { x: 108.72, y: 197.8 }],
  [64, { x: 134.42, y: 159.55 }],
  [65, { x: 79.93, y: 165.15 }],
  [66, { x: 105.04, y: 127.71 }],
  [67, { x: 224.17, y: 118.71 }],
  [68, { x: 192.56, y: 84.16 }],
  [69, { x: 189.73, y: 156.03 }],
  [70, { x: 256.99, y: 84.88 }],
  [71, { x: 281.27, y: 122.38 }],
  [72, { x: 316.96, y: 93.16 }],
  [73, { x: 245.7, y: 153.96 }],
  [74, { x: 344.37, y: 127.71 }],
  [75, { x: 436.38, y: 219.55 }],
  [76, { x: 218.11, y: 186.55 }],
  [77, { x: 163.73, y: 189.78 }],
  [78, { x: 163.73, y: 122.38 }],
  [79, { x: 399.99, y: 140.38 }],
  [80, { x: 275.93, y: 187.3 }],
  [81, { x: 363.91, y: 165.15 }],
  [82, { x: 224.17, y: 55.5 }],
  [83, { x: 331.41, y: 192.55 }],
  [84, { x: 296.0, y: 55.5 }],
  [85, { x: 423.66, y: 177.55 }],
  [86, { x: 376.93, y: 102.88 }],
  [87, { x: 349.71, y: 66.88 }],
  [88, { x: 384.41, y: 201.55 }],
  [89, { x: 329.99, y: 30.13 }],
  [90, { x: 264.2, y: 25.62 }],
  [91, { x: 159.0, y: 55.63 }],
  [92, { x: 194.22, y: 24.0 }],
  [93, { x: 131.17, y: 28.45 }],
]);

/**
 * Left-hand opening layout: MIDI note -> button position.
 * 33 keys, C2 (36) to A4 (69). Missing chromatic note: C#2 (37).
 */
export const bandoneonLeftOpeningKeyPositions = new Map<CodePoint, KeyPosition>(
  [
    [36, { x: 206.63, y: 16.1 }],
    [38, { x: 209.99, y: 436.0 }],
    [39, { x: 184.9, y: 81.5 }],
    [40, { x: 72.69, y: 419.62 }],
    [41, { x: 79.93, y: 16.0 }],
    [42, { x: 152.47, y: 36.26 }],
    [43, { x: 104.49, y: 62.71 }],
    [44, { x: 25.34, y: 328.3 }],
    [45, { x: 59.77, y: 358.74 }],
    [46, { x: 18.1, y: 263.0 }],
    [47, { x: 196.45, y: 390.23 }],
    [48, { x: 86.23, y: 129.48 }],
    [49, { x: 16.0, y: 193.51 }],
    [50, { x: 98.51, y: 383.41 }],
    [51, { x: 42.98, y: 229.52 }],
    [52, { x: 151.21, y: 412.38 }],
    [53, { x: 17.89, y: 123.18 }],
    [54, { x: 175.14, y: 147.01 }],
    [55, { x: 50.54, y: 293.66 }],
    [56, { x: 140.81, y: 362.62 }],
    [57, { x: 91.16, y: 326.93 }],
    [58, { x: 54.32, y: 91.48 }],
    [59, { x: 130.0, y: 303.42 }],
    [60, { x: 78.67, y: 259.75 }],
    [61, { x: 133.68, y: 103.97 }],
    [62, { x: 120.45, y: 238.12 }],
    [63, { x: 165.8, y: 216.71 }],
    [64, { x: 80.77, y: 196.97 }],
    [65, { x: 49.17, y: 158.87 }],
    [66, { x: 123.81, y: 171.15 }],
    [67, { x: 184.17, y: 342.15 }],
    [68, { x: 30.8, y: 49.28 }],
    [69, { x: 173.57, y: 280.01 }],
  ],
);

/**
 * Left-hand closing layout: MIDI note -> button position.
 * 33 keys, C#2 (37) to B4 (71). Missing chromatic notes: C2 (36), D#2 (39), A4 (69), A#4 (70).
 */
export const bandoneonLeftClosingKeyPositions = new Map<CodePoint, KeyPosition>(
  [
    [37, { x: 184.9, y: 81.5 }],
    [38, { x: 72.69, y: 419.62 }],
    [40, { x: 209.99, y: 436.0 }],
    [41, { x: 206.63, y: 16.1 }],
    [42, { x: 79.93, y: 16.0 }],
    [43, { x: 98.51, y: 383.41 }],
    [44, { x: 25.34, y: 328.3 }],
    [45, { x: 151.21, y: 412.38 }],
    [46, { x: 18.1, y: 263.0 }],
    [47, { x: 152.47, y: 36.26 }],
    [48, { x: 54.32, y: 91.48 }],
    [49, { x: 49.17, y: 158.87 }],
    [50, { x: 59.77, y: 358.74 }],
    [51, { x: 16.0, y: 193.51 }],
    [52, { x: 140.81, y: 362.62 }],
    [53, { x: 175.14, y: 147.01 }],
    [54, { x: 104.49, y: 62.71 }],
    [55, { x: 91.16, y: 326.93 }],
    [56, { x: 133.68, y: 103.97 }],
    [57, { x: 130.0, y: 303.42 }],
    [58, { x: 50.54, y: 293.66 }],
    [59, { x: 78.67, y: 259.75 }],
    [60, { x: 42.98, y: 229.52 }],
    [61, { x: 120.45, y: 238.12 }],
    [62, { x: 80.77, y: 196.97 }],
    [63, { x: 17.89, y: 123.18 }],
    [64, { x: 123.81, y: 171.15 }],
    [65, { x: 86.23, y: 129.48 }],
    [66, { x: 184.17, y: 342.15 }],
    [67, { x: 30.8, y: 49.28 }],
    [68, { x: 173.57, y: 280.01 }],
    [71, { x: 165.8, y: 216.71 }],
  ],
);

/**
 * Right-hand bisonoric mapping: opening MIDI -> closing MIDI.
 * Each entry maps the note produced when opening to the note
 * the same physical button produces when closing.
 */
export const rightHandBisonoricMap = new Map<CodePoint, CodePoint>([
  [57, 57],
  [58, 58],
  [59, 59],
  [65, 65],
  [60, 62],
  [63, 63],
  [61, 60],
  [64, 66],
  [95, 93],
  [70, 64],
  [62, 61],
  [77, 77],
  [93, 91],
  [73, 78],
  [68, 69],
  [92, 92],
  [67, 68],
  [75, 76],
  [66, 67],
  [90, 82],
  [71, 73],
  [82, 70],
  [78, 80],
  [91, 90],
  [69, 71],
  [88, 84],
  [74, 76],
  [84, 72],
  [81, 83],
  [89, 89],
  [72, 74],
  [87, 87],
  [80, 81],
  [86, 86],
  [85, 88],
  [76, 79],
  [83, 85],
  [79, 75],
]);

/**
 * Left-hand bisonoric mapping: opening MIDI -> closing MIDI.
 * Each entry maps the note produced when opening to the note
 * the same physical button produces when closing.
 */
export const leftHandBisonoricMap = new Map<CodePoint, CodePoint>([
  [41, 42],
  [36, 41],
  [42, 47],
  [68, 67],
  [43, 54],
  [39, 37],
  [58, 48],
  [61, 56],
  [53, 63],
  [48, 65],
  [54, 53],
  [65, 49],
  [66, 64],
  [49, 51],
  [64, 62],
  [63, 71],
  [51, 60],
  [62, 61],
  [60, 59],
  [46, 46],
  [69, 68],
  [55, 58],
  [59, 57],
  [57, 55],
  [44, 44],
  [67, 66],
  [45, 50],
  [56, 52],
  [50, 43],
  [47, 52],
  [52, 45],
  [40, 38],
  [38, 40],
]);
