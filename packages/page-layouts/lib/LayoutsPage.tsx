import {
  BANDONEON_LAYOUTS,
  bandoneonByLayout,
  type BandoneonLayout,
} from "@keybr/instrument";
import { Article, Header, Para } from "@keybr/widget";
import { FormattedMessage, useIntl } from "react-intl";

export function LayoutsPage() {
  const { formatMessage } = useIntl();
  return (
    <Article>
      <Header level={1}>
        <FormattedMessage id="t_Layouts" defaultMessage="Layouts" />
      </Header>
      <Para>
        <FormattedMessage
          id="settings.music.layout.description"
          defaultMessage="Choose which hand and bellows direction to practice. Notes and highlights are limited to the selected keyboard layout."
        />
      </Para>
      {BANDONEON_LAYOUTS.map((layout) => {
        const instrument = bandoneonByLayout(layout);
        return (
          <section key={layout}>
            <Header level={2}>
              {formatMessage(BANDONEON_LAYOUT_LABEL[layout])}
            </Header>
            <Para>{instrument.name}</Para>
            <Para>
              {`MIDI range: ${instrument.range.minMidiNote} - ${instrument.range.maxMidiNote} (${midiNoteToLabel(instrument.range.minMidiNote)} - ${midiNoteToLabel(instrument.range.maxMidiNote)})`}
            </Para>
            <Para>{`Notes available: ${instrument.letters.length}`}</Para>
          </section>
        );
      })}
    </Article>
  );
}

const BANDONEON_LAYOUT_LABEL: Record<
  BandoneonLayout,
  { id: string; defaultMessage: string }
> = {
  "right-opening": {
    id: "settings.music.layout.rightOpening",
    defaultMessage: "Right hand opening",
  },
  "right-closing": {
    id: "settings.music.layout.rightClosing",
    defaultMessage: "Right hand closing",
  },
  "left-opening": {
    id: "settings.music.layout.leftOpening",
    defaultMessage: "Left hand opening",
  },
  "left-closing": {
    id: "settings.music.layout.leftClosing",
    defaultMessage: "Left hand closing",
  },
};

function midiNoteToLabel(midiNote: number): string {
  const noteNames = [
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
  const octave = Math.floor(midiNote / 12) - 1;
  return `${noteNames[midiNote % 12]}${octave}`;
}
