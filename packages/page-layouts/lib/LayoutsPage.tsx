import {
  BANDONEON_LAYOUTS,
  bandoneonByLayout,
  type BandoneonLayout,
} from "@keybr/instrument";
import { Article, Header, Para } from "@keybr/widget";
import { FormattedMessage, useIntl } from "react-intl";
import bandoneonLeftClosing from "../../page-practice/assets/bandoneon-left-closing.svg";
import bandoneonLeftOpening from "../../page-practice/assets/bandoneon-left-opening.svg";
import bandoneonRightClosing from "../../page-practice/assets/bandoneon-right-closing.svg";
import bandoneonRightOpening from "../../page-practice/assets/bandoneon-right-opening.svg";

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
        const images = layout.includes("opening")
          ? {
              left: bandoneonLeftOpening,
              right: bandoneonRightOpening,
              direction: "Opening",
            }
          : {
              left: bandoneonLeftClosing,
              right: bandoneonRightClosing,
              direction: "Closing",
            };
        return (
          <section key={layout}>
            <Header level={2}>
              {formatMessage(BANDONEON_LAYOUT_LABEL[layout])}
            </Header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.2rem",
                alignItems: "start",
              }}
            >
              <figure style={{ margin: 0 }}>
                <img
                  src={images.left}
                  alt={`Bandoneon left hand ${images.direction.toLowerCase()} keyboard`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.8rem",
                  }}
                />
              </figure>
              <figure style={{ margin: 0 }}>
                <img
                  src={images.right}
                  alt={`Bandoneon right hand ${images.direction.toLowerCase()} keyboard`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.8rem",
                  }}
                />
              </figure>
            </div>
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
