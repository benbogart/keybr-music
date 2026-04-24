# C octaves (left hand + right hand) — pitch test recording

**Put your exported `.wav` in this directory** as:

`c2-c6 octaves.wav`

(Legacy name `c-scale-cascade-lh-rh.wav` is still accepted if present.)

- **Format:** 16-bit PCM (mono or stereo; stereo is mixed to mono in tests)
- **Content:** C2, C3, C4, C5, C6, C5, C4, C3, C2 (first three left hand, remainder right hand)

The integration test in `@keybr/pitch-detection` (`sequence-c-scale.test.ts`) looks here first, then
`packages/keybr-pitch-detection/test-fixtures/`, then `PITCH_TEST_WAV`.

From the repo root:

- `npm test -w @keybr/pitch-detection` — C octaves + synthetic (detector + processor only).
- `npm test -w @keybr/pitch-input` — **practice-style** replay: detector + `PitchInputAdapter` on the partial minor `.wav` files (A3 must pass; set `RUN_PARTIAL_MINOR_ALL_ROOTS=1` to run A2/A4/A5, which currently fail until octave detection improves).
