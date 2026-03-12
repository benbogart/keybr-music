import {
  Attr,
  type LineList,
  type TextDisplaySettings,
} from "@keybr/textinput";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Stem,
} from "vexflow";
import * as styles from "./MusicStaff.module.less";
import { type TextLineSize } from "./TextLines.tsx";

type MusicStaffNoteState = "pending" | "active" | "completed" | "error";

type MusicStaffNote = {
  readonly midiNote: number;
  readonly key: string;
  readonly accidental: string | null;
  readonly state: MusicStaffNoteState;
};

const STAVE_INTERNAL_WIDTH = 800;
const STAVE_LINE_HEIGHT = 100;
const STAVE_Y_OFFSET = 10;

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

export const MusicStaff = memo(function MusicStaff({
  settings,
  lines,
  size = "X0",
  focus,
}: {
  readonly settings: TextDisplaySettings;
  readonly lines: LineList;
  readonly size?: TextLineSize;
  readonly focus: boolean;
}): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const notes = useMemo(
    () =>
      toMusicStaffNotes(
        lines,
        settings.codePointLabels,
        settings.musicNotation,
      ),
    [lines, settings.codePointLabels, settings.musicNotation],
  );
  const clef = useMemo(
    () => chooseClef(notes, settings.musicNotation?.clef),
    [notes, settings.musicNotation?.clef],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (el == null) {
      return;
    }
    const handler = (ev: WheelEvent) => {
      if (el.scrollHeight > el.clientHeight) {
        ev.stopPropagation();
      }
    };
    el.addEventListener("wheel", handler);
    return () => {
      el.removeEventListener("wheel", handler);
    };
  }, []);

  useEffect(() => {
    const container = staffRef.current;
    if (container == null) {
      return;
    }

    container.replaceChildren();
    if (notes.length === 0) {
      return;
    }

    const targetLines = 2;
    const notesPerLine = Math.max(4, Math.ceil(notes.length / targetLines));
    const rows = chunkNotes(notes, notesPerLine);
    const totalHeight = rows.length * STAVE_LINE_HEIGHT + STAVE_Y_OFFSET;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(STAVE_INTERNAL_WIDTH, totalHeight);
    const context = renderer.getContext();

    for (let row = 0; row < rows.length; row++) {
      const rowNotes = rows[row];
      const y = row * STAVE_LINE_HEIGHT + STAVE_Y_OFFSET;
      const stave = new Stave(0, y, STAVE_INTERNAL_WIDTH);
      stave.addClef(clef);
      stave.setContext(context).draw();

      const staveNotes = rowNotes.map((note) => {
        const staveNote = new StaveNote({
          clef,
          keys: [note.key],
          duration: "q",
          autoStem: false,
        });
        if (note.accidental != null) {
          staveNote.addModifier(new Accidental(note.accidental), 0);
        }
        staveNote.setStem(new Stem({ hide: true }));
        const [className, style] = styleForState(note.state);
        staveNote.addClass(className).setStyle(style);
        staveNote.setLedgerLineStyle({
          strokeStyle: "#000",
          fillStyle: "#000",
        });
        return staveNote;
      });

      Formatter.FormatAndDraw(context, stave, staveNotes);
    }

    const svg = container.querySelector("svg");
    if (svg != null) {
      svg.setAttribute("viewBox", `0 0 ${STAVE_INTERNAL_WIDTH} ${totalHeight}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "auto";
    }

    const renderedNotes =
      container.querySelectorAll<SVGGElement>("g.vf-stavenote");
    for (let i = 0; i < notes.length; i++) {
      const rendered = renderedNotes[i];
      if (rendered != null) {
        rendered.classList.add(classNameForState(notes[i].state));
      }
    }

    const activeEl = container.querySelector<SVGGElement>(".music-note-active");
    if (activeEl != null && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [clef, notes, size]);

  return (
    <div
      ref={rootRef}
      className={[styles.root, focus ? styles.focus : styles.blur].join(" ")}
      data-testid="music-staff"
      data-clef={clef}
    >
      <div ref={staffRef} className={styles.staff} />
    </div>
  );
});

function toMusicStaffNotes(
  lines: LineList,
  codePointLabels: ReadonlyMap<number, string> | undefined,
  musicNotation:
    | {
        readonly clef: "treble" | "bass" | "grand";
      }
    | undefined,
): MusicStaffNote[] {
  const notes: MusicStaffNote[] = [];
  void musicNotation;
  for (const line of lines.lines) {
    for (const char of line.chars) {
      if (char.codePoint <= 0x0020) {
        continue;
      }
      const midiNote = char.codePoint;
      const note = toVexNote(midiNote, codePointLabels?.get(char.codePoint));
      notes.push({
        midiNote,
        key: note.key,
        accidental: note.accidental,
        state: toNoteState(char.attrs),
      });
    }
  }
  return notes;
}

function toVexNote(midiNote: number, label: string | undefined) {
  const parsed = parseLabel(label);
  if (parsed != null) {
    return parsed;
  }
  const octave = Math.floor(midiNote / 12) - 1;
  const name = NOTE_NAMES[midiNote % NOTE_NAMES.length];
  const letter = name[0].toLowerCase();
  const accidental = name.length > 1 ? name[1] : null;
  return {
    key: `${letter}${accidental ?? ""}/${octave}`,
    accidental,
  };
}

function parseLabel(label: string | undefined) {
  if (label == null) {
    return null;
  }
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(label.trim());
  if (m == null) {
    return null;
  }
  const [, note, accidental, octave] = m;
  return {
    key: `${note.toLowerCase()}${accidental}/${octave}`,
    accidental: accidental || null,
  };
}

function toNoteState(attrs: number): MusicStaffNoteState {
  if (attrs & Attr.Cursor) {
    return "active";
  }
  if (attrs & (Attr.Garbage | Attr.Miss)) {
    return "error";
  }
  if (attrs & Attr.Hit) {
    return "completed";
  }
  return "pending";
}

function chunkNotes(
  notes: readonly MusicStaffNote[],
  perLine: number,
): MusicStaffNote[][] {
  const rows: MusicStaffNote[][] = [];
  for (let i = 0; i < notes.length; i += perLine) {
    rows.push(notes.slice(i, i + perLine));
  }
  return rows.length > 0 ? rows : [[]];
}

function chooseClef(
  notes: readonly MusicStaffNote[],
  notationClef: "treble" | "bass" | "grand" | undefined,
): "treble" | "bass" {
  if (notationClef === "bass") {
    return "bass";
  }
  if (notationClef === "treble") {
    return "treble";
  }
  if (notes.length === 0) {
    return "treble";
  }
  const avg =
    notes.reduce((acc, note) => acc + note.midiNote, 0) / notes.length;
  return avg < 60 ? "bass" : "treble";
}

function styleForState(state: MusicStaffNoteState) {
  switch (state) {
    case "active":
      return [
        "music-note-active",
        { fillStyle: "#16a34a", strokeStyle: "#16a34a" },
      ] as const;
    case "completed":
      return [
        "music-note-completed",
        { fillStyle: "#475569", strokeStyle: "#475569" },
      ] as const;
    case "error":
      return [
        "music-note-error",
        { fillStyle: "#dc2626", strokeStyle: "#dc2626" },
      ] as const;
    case "pending":
      return [
        "music-note-pending",
        { fillStyle: "#94a3b8", strokeStyle: "#94a3b8" },
      ] as const;
  }
}

function classNameForState(state: MusicStaffNoteState): string {
  switch (state) {
    case "active":
      return "music-note-active";
    case "completed":
      return "music-note-completed";
    case "error":
      return "music-note-error";
    case "pending":
      return "music-note-pending";
  }
}
