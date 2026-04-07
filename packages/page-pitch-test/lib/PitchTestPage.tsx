import {
  BANDONEON_LAYOUTS,
  bandoneonByLayout,
  type BandoneonLayout,
} from "@keybr/instrument";
import type {
  PitchDetector,
  PitchDiagnosticSnapshot,
  PitchEvent,
} from "@keybr/pitch-detection";
import { createPitchDetector } from "@keybr/pitch-detection";
import { Article } from "@keybr/widget";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LogEntry = {
  readonly timeStamp: number;
  readonly midiNote: number;
  readonly noteName: string;
  readonly frequency: number;
  readonly cents: number;
  readonly confidence: number;
  readonly delta: number | null;
};

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

const LAYOUT_LABELS: Readonly<Record<BandoneonLayout, string>> = {
  "right-opening": "Right Hand Opening",
  "right-closing": "Right Hand Closing",
  "left-opening": "Left Hand Opening",
  "left-closing": "Left Hand Closing",
};

function midiToNoteName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function midiToReferenceFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function centsDeviation(detectedFrequency: number, referenceFrequency: number) {
  return 1200 * Math.log2(detectedFrequency / referenceFrequency);
}

function formatSignedCents(cents: number) {
  return `${cents >= 0 ? "+" : ""}${cents.toFixed(1)}c`;
}

export function PitchTestPage() {
  const [layout, setLayout] = useState<BandoneonLayout>("left-opening");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<readonly LogEntry[]>([]);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [noiseFloor, setNoiseFloor] = useState(0.01);
  const detectorRef = useRef<PitchDetector | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastMidiRef = useRef<number | null>(null);
  const levelFrameRef = useRef(0);
  const lastDiagLogRef = useRef(0);
  const activeInstrument = useMemo(() => bandoneonByLayout(layout), [layout]);
  const validMidiNotes = useMemo(
    () => new Set(activeInstrument.keymap.keys()),
    [activeInstrument],
  );

  const handleLevel = useCallback((rmsLevel: number) => {
    // Throttle level updates to every 3rd frame to avoid excessive renders.
    levelFrameRef.current += 1;
    if (levelFrameRef.current % 3 === 0) {
      setLevel(rmsLevel);
    }
  }, []);

  const handlePitch = useCallback((event: PitchEvent) => {
    const { timeStamp, midiNote, frequency, confidence } = event;

    // Only log when the note changes (deduplicate sustained notes).
    if (midiNote === lastMidiRef.current) {
      return;
    }

    const delta =
      lastTimeRef.current != null ? timeStamp - lastTimeRef.current : null;
    lastTimeRef.current = timeStamp;
    lastMidiRef.current = midiNote;

    const noteName = midiToNoteName(midiNote);
    const referenceFrequency = midiToReferenceFrequency(midiNote);
    setCurrentNote(noteName);

    setLog((prev) => {
      const entry: LogEntry = {
        timeStamp,
        midiNote,
        noteName,
        frequency,
        cents: centsDeviation(frequency, referenceFrequency),
        confidence,
        delta,
      };
      const next = [entry, ...prev];
      if (next.length > 50) {
        next.length = 50;
      }
      return next;
    });
  }, []);

  const noiseFloorRef = useRef(noiseFloor);
  useEffect(() => {
    noiseFloorRef.current = noiseFloor;
  }, [noiseFloor]);

  const logPitchDiagnostic = useCallback((snap: PitchDiagnosticSnapshot) => {
    const now = snap.timeStamp;
    const shouldThrottle =
      snap.emitted == null && now - lastDiagLogRef.current < 120;
    if (shouldThrottle) {
      return;
    }
    lastDiagLogRef.current = now;

    const yinStr =
      snap.yin == null
        ? "—"
        : `${snap.yin.frequency.toFixed(1)} Hz MIDI ${snap.yin.midiNote} conf ${snap.yin.confidence.toFixed(2)}`;
    const blockStr = snap.blockedBy ?? "—";
    const rejectStr = snap.processorRejected ?? "—";
    const stabStr =
      snap.stabilizing == null
        ? "—"
        : `MIDI ${snap.stabilizing.midiNote} ${snap.stabilizing.frames}/${snap.stabilizing.requiredFrames}`;
    const outStr =
      snap.emitted == null
        ? "—"
        : `${snap.emitted.frequency.toFixed(1)} Hz MIDI ${snap.emitted.midiNote} conf ${snap.emitted.confidence.toFixed(2)}`;

    console.log(
      `[pitch] rms=${snap.rms.toFixed(4)} yin=${yinStr} blocked=${blockStr} processor=${rejectStr} stabilize=${stabStr} emitted=${outStr}`,
    );
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      lastDiagLogRef.current = 0;
      const detector = createPitchDetector({
        bufferSize: 2048,
        minConfidence: 0.7,
        stableFrames: 2,
        validMidiNotes,
        noiseFloor: noiseFloorRef.current,
        onPitchDiagnostic: logPitchDiagnostic,
      });
      detector.onPitch = handlePitch;
      detector.onLevel = handleLevel;
      detectorRef.current = detector;
      lastTimeRef.current = null;
      lastMidiRef.current = null;
      levelFrameRef.current = 0;
      await detector.start();
      setRunning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [handlePitch, handleLevel, validMidiNotes, logPitchDiagnostic]);

  const stop = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    setRunning(false);
    setCurrentNote(null);
    lastTimeRef.current = null;
    lastMidiRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setLog([]);
  }, []);

  return (
    <Article>
      <h1>Pitch Detection Test</h1>
      <p>
        Click <strong>Start</strong>, grant microphone access, and play your
        instrument. Detected pitches will appear below.
      </p>
      <p style={{ fontFamily: "monospace", fontSize: "13px", color: "#555" }}>
        Open the browser devtools console for <code>[pitch]</code> lines: raw
        YIN frequency and MIDI, RMS gate, layout / confidence rejections,
        stability counter, and emitted note events (lines with a new emitted
        note are not throttled; others are limited to about 8 per second).
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button disabled={running} onClick={start}>
          Start Listening
        </button>
        <button disabled={!running} onClick={stop}>
          Stop
        </button>
        <button disabled={log.length === 0} onClick={clear}>
          Clear Log
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontFamily: "monospace", fontSize: "14px" }}>
          Active layout:{" "}
          <select
            value={layout}
            disabled={running}
            onChange={(event) =>
              setLayout(event.target.value as BandoneonLayout)
            }
          >
            {BANDONEON_LAYOUTS.map((nextLayout) => (
              <option key={nextLayout} value={nextLayout}>
                {LAYOUT_LABELS[nextLayout]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontFamily: "monospace", fontSize: "14px" }}>
          Noise floor:{" "}
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={noiseFloor}
            onChange={(e) => setNoiseFloor(Number(e.target.value))}
            style={{ verticalAlign: "middle", width: "200px" }}
          />{" "}
          {noiseFloor.toFixed(3)}
        </label>
        {running && (
          <div
            style={{
              marginTop: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          >
            <span>Level: </span>
            <span
              style={{
                display: "inline-block",
                width: "200px",
                height: "12px",
                background: "#eee",
                borderRadius: "2px",
                overflow: "hidden",
                verticalAlign: "middle",
                position: "relative",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${Math.min(100, level * 1000)}%`,
                  background: level >= noiseFloor ? "#4caf50" : "#999",
                  transition: "width 50ms",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${Math.min(100, noiseFloor * 1000)}%`,
                  width: "2px",
                  height: "100%",
                  background: "#d32f2f",
                }}
              />
            </span>{" "}
            {level.toFixed(4)}
          </div>
        )}
      </div>

      {error != null && (
        <div
          style={{
            color: "#d32f2f",
            padding: "8px 12px",
            marginBottom: "16px",
            background: "#fdecea",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {currentNote != null && (
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            textAlign: "center",
            padding: "24px 0",
            fontFamily: "monospace",
          }}
        >
          {currentNote}
        </div>
      )}

      {log.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              {[
                "Note",
                "MIDI",
                "Frequency",
                "Cents",
                "Confidence",
                "Delta (ms)",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "4px 8px",
                    borderBottom: "2px solid #ccc",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.map((entry, i) => (
              <tr key={i}>
                <td style={{ padding: "4px 8px", fontWeight: "bold" }}>
                  {entry.noteName}
                </td>
                <td style={{ padding: "4px 8px" }}>{entry.midiNote}</td>
                <td style={{ padding: "4px 8px" }}>
                  {entry.frequency.toFixed(1)} Hz
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {formatSignedCents(entry.cents)}
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {entry.confidence.toFixed(2)}
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {entry.delta != null ? entry.delta.toFixed(0) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Article>
  );
}
