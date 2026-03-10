import { useCollator } from "@keybr/intl";
import {
  KeyboardContext,
  keyboardProps,
  Layout,
  loadKeyboard,
  useFormattedNames,
} from "@keybr/keyboard";
import { Letter } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import {
  type KeyStatsMap,
  makeKeyStatsMap,
  type Result,
  ResultGroups,
  SpeedUnit,
  uiProps,
  useResults,
} from "@keybr/result";
import { SettingsContext, useSettings } from "@keybr/settings";
import { Field, FieldList, OptionList } from "@keybr/widget";
import { type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

const BANDONEON_FAMILY = "bandoneon";
const BANDONEON_DEFAULT_MIN_MIDI = 60;
const BANDONEON_DEFAULT_MAX_MIDI = 71;
const SPACE_CODE_POINT = 0x0020;
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

export function ResultGrouper({
  children,
}: {
  children: (keyStatsMap: KeyStatsMap) => ReactNode;
}) {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const { results } = useResults();
  const groups = ResultGroups.byLayout(results);
  const resultsLayouts = new Set(groups.keys());
  const configuredLayout = settings.get(keyboardProps.layout);
  if (resultsLayouts.size === 0) {
    resultsLayouts.add(configuredLayout);
  }
  const defaultLayout = () =>
    resultsLayouts.has(configuredLayout)
      ? configuredLayout
      : [...resultsLayouts][0];
  const [selectedLayout, setSelectedLayout] = useState(defaultLayout);
  const [characterClass, setCharacterClass] = useState("letters");
  if (!resultsLayouts.has(selectedLayout)) {
    setSelectedLayout(defaultLayout());
  }
  const layoutOptions = useLayoutOptions(resultsLayouts);
  const keyboard = loadKeyboard(selectedLayout);
  const group = groups.get(selectedLayout);
  const isBandoneonLayout = selectedLayout.family === BANDONEON_FAMILY;
  const profileSettings = isBandoneonLayout
    ? settings.set(uiProps.speedUnit, SpeedUnit.CPM)
    : settings;

  return (
    <>
      <FieldList>
        <Field>
          <FormattedMessage
            id="t_Show_statistics_for:"
            defaultMessage="Show statistics for:"
          />
        </Field>
        <Field>
          <OptionList
            options={layoutOptions}
            value={selectedLayout.id}
            onSelect={(value) => {
              setSelectedLayout(Layout.ALL.get(value));
            }}
          />
        </Field>
        {isBandoneonLayout || (
          <Field>
            <OptionList
              options={[
                {
                  name: formatMessage({
                    id: "t_cc_Letters",
                    defaultMessage: "Letters",
                  }),
                  value: "letters",
                },
                {
                  name: formatMessage({
                    id: "t_cc_Digits",
                    defaultMessage: "Digits",
                  }),
                  value: "digits",
                },
                {
                  name: formatMessage({
                    id: "t_cc_Punctuation_characters",
                    defaultMessage: "Punctuation characters",
                  }),
                  value: "punctuators",
                },
                {
                  name: formatMessage({
                    id: "t_cc_Special_characters",
                    defaultMessage: "Special characters",
                  }),
                  value: "specials",
                },
              ]}
              value={characterClass}
              onSelect={(value) => {
                setCharacterClass(value);
              }}
            />
          </Field>
        )}
      </FieldList>

      <SettingsContext.Provider
        value={{
          settings: profileSettings,
          updateSettings,
        }}
      >
        <KeyboardContext.Provider value={keyboard}>
          {isBandoneonLayout ? (
            children(makeKeyStatsMap(makeBandoneonLetters(group), group))
          ) : (
            <PhoneticModelLoader language={selectedLayout.language}>
              {({ letters }) => {
                switch (characterClass) {
                  case "letters":
                    return children(
                      makeKeyStatsMap(
                        Letter.restrict(letters, keyboard.getCodePoints()),
                        group,
                      ),
                    );
                  case "digits":
                    return children(makeKeyStatsMap(Letter.digits, group));
                  case "punctuators":
                    return children(makeKeyStatsMap(Letter.punctuators, group));
                  case "specials":
                    return children(makeKeyStatsMap(Letter.specials, group));
                  default:
                    throw new Error();
                }
              }}
            </PhoneticModelLoader>
          )}
        </KeyboardContext.Provider>
      </SettingsContext.Provider>
    </>
  );
}

function useLayoutOptions(layouts: Iterable<Layout>) {
  const { formatFullLayoutName } = useFormattedNames();
  const { compare } = useCollator();
  return [...layouts]
    .map((item) => ({
      value: item.id,
      name: formatFullLayoutName(item),
    }))
    .sort((a, b) => compare(a.name, b.name));
}

function makeBandoneonLetters(results: readonly Result[]): readonly Letter[] {
  const codePoints = new Set<number>();
  for (const result of results) {
    for (const sample of result.histogram) {
      if (sample.codePoint !== SPACE_CODE_POINT) {
        codePoints.add(sample.codePoint);
      }
    }
  }
  if (codePoints.size === 0) {
    for (
      let codePoint = BANDONEON_DEFAULT_MIN_MIDI;
      codePoint <= BANDONEON_DEFAULT_MAX_MIDI;
      codePoint++
    ) {
      codePoints.add(codePoint);
    }
  }
  const sorted = [...codePoints].sort((a, b) => a - b);
  const frequency = sorted.length > 0 ? 1 / sorted.length : 0;
  return sorted.map(
    (codePoint) => new Letter(codePoint, frequency, midiNoteToLabel(codePoint)),
  );
}

function midiNoteToLabel(codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 127) {
    return String.fromCodePoint(codePoint);
  }
  const octave = Math.floor(codePoint / 12) - 1;
  return `${NOTE_NAMES[codePoint % NOTE_NAMES.length]}${octave}`;
}
