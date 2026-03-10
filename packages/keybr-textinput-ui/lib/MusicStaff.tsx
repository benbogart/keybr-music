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

const sizeToHeight: Record<TextLineSize, number> = {
  X0: 120,
  X1: 140,
  X2: 160,
  X3: 180,
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
  const ref = useRef<HTMLDivElement>(null);
  const notes = useMemo(
    () => toMusicStaffNotes(lines, settings.codePointLabels),
    [lines, settings.codePointLabels],
  );
  const clef = useMemo(() => chooseClef(notes), [notes]);

  useEffect(() => {
    const container = ref.current;
    if (container == null) {
      return;
    }

    container.replaceChildren();
    if (notes.length === 0) {
      return;
    }

    const width = Math.max(240, notes.length * 42 + 80);
    const height = sizeToHeight[size];
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    const stave = new Stave(0, 10, width);
    stave.addClef(clef);
    stave.setContext(context).draw();

    const staveNotes = notes.map((note) => {
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
      return staveNote;
    });

    Formatter.FormatAndDraw(context, stave, staveNotes);

    const renderedNotes =
      container.querySelectorAll<SVGGElement>("g.vf-stavenote");
    for (let i = 0; i < notes.length; i++) {
      const rendered = renderedNotes[i];
      if (rendered != null) {
        rendered.classList.add(classNameForState(notes[i].state));
      }
    }
  }, [clef, notes, size]);

  return (
    <div
      className={[styles.root, focus ? styles.focus : styles.blur].join(" ")}
      data-testid="music-staff"
      data-clef={clef}
    >
      <div ref={ref} className={styles.staff} />
    </div>
  );
});

function toMusicStaffNotes(
  lines: LineList,
  codePointLabels: ReadonlyMap<number, string> | undefined,
): MusicStaffNote[] {
  const notes: MusicStaffNote[] = [];
  for (const line of lines.lines) {
    for (const char of line.chars) {
      if (char.codePoint <= 0x0020) {
        continue;
      }
      const note = toVexNote(
        char.codePoint,
        codePointLabels?.get(char.codePoint),
      );
      notes.push({
        midiNote: char.codePoint,
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
  if (attrs & Attr.Garbage) {
    return "error";
  }
  if (attrs & (Attr.Hit | Attr.Miss)) {
    return "completed";
  }
  return "pending";
}

function chooseClef(notes: readonly MusicStaffNote[]): "treble" | "bass" {
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
