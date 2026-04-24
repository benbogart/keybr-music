# C cascade (left hand + right hand) — pitch test recording

**Put your exported `.wav` in this directory** (e.g. drag the attachment from the issue into
`tests/pitch/c-scale-cascade-lh-rh/` in your clone and name it as below) as:

`c-scale-cascade-lh-rh.wav`

- **Format:** 16-bit PCM (mono or stereo; stereo is mixed to mono in tests)
- **Content:** C2, C3, C4, C5, C6, C5, C4, C3, C2 (first three left hand, remainder right hand)

The integration test in `@keybr/pitch-detection` (`sequence-c-scale.test.ts`) looks for this file
under the repo’s `tests/pitch/c-scale-cascade-lh-rh/` directory first, then
`packages/keybr-pitch-detection/test-fixtures/`, and finally `PITCH_TEST_WAV`.

After adding the file, from the repo root run:

`npm test -w @keybr/pitch-detection`
