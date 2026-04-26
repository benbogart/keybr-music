# Bandoneon pitch test recordings

This directory holds real bandoneon `.wav` recordings used by the offline
replay tests in `@keybr/pitch-detection` and `@keybr/pitch-input`.

- **Format:** 16-bit PCM (mono or stereo; stereo is mixed to mono in tests)

## Recordings

- `c2-c6 octaves.wav` — C2, C3, C4, C5, C6, C5, C4, C3, C2 (first three left
  hand, remainder right hand). Used by `sequence-c-scale.test.ts`.
  - Legacy name `c-scale-cascade-lh-rh.wav` is still accepted if present.
- `a2 partial minor scale.wav`, `a3 partial minor scale.wav`,
  `a4 partial minor scale.wav`, `a5 partial minor scale.wav` — A B C D E D C B
  A G# A at four different roots; used by the practice-pipeline integration
  test in `@keybr/pitch-input`.
- `repeated notes.wav` — a3, g#3, a3, a3, b3, b3, b3, c4, c4, c4, c4, b3.
  Used by `sequence-repeated-notes.test.ts` to guard against regressions where
  re-attacks of an already-emitted note are silently dropped.

The integration test in `@keybr/pitch-detection` (`sequence-c-scale.test.ts`)
looks here first, then `packages/keybr-pitch-detection/test-fixtures/`, then
`PITCH_TEST_WAV`.

From the repo root:

- `npm test -w @keybr/pitch-detection` — C octaves + repeated-notes + synthetic
  (detector + processor only).
- `npm test -w @keybr/pitch-input` — **practice-style** replay: detector +
  `PitchInputAdapter` on the partial minor `.wav` files (A3 must pass; set
  `RUN_PARTIAL_MINOR_ALL_ROOTS=1` to run A2/A4/A5, which currently fail until
  octave detection improves).
