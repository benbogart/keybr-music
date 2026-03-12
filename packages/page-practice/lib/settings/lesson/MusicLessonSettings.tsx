import { BANDONEON_LAYOUTS, type BandoneonLayout } from "@keybr/instrument";
import { lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import {
  Description,
  Explainer,
  Field,
  FieldList,
  FieldSet,
  OptionList,
} from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

const LAYOUT_NAME: Record<
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

export function MusicLessonSettings(): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  return (
    <>
      <FieldSet
        legend={formatMessage({
          id: "settings.music.instrumentOptions",
          defaultMessage: "Instrument options",
        })}
      >
        <FieldList>
          <Field>
            <FormattedMessage
              id="settings.music.layout.label"
              defaultMessage="Bandoneon layout"
            />
          </Field>
          <Field>
            <OptionList
              options={BANDONEON_LAYOUTS.map((layout) => ({
                value: layout,
                name: formatMessage(LAYOUT_NAME[layout]),
              }))}
              value={settings.get(lessonProps.music.layout)}
              onSelect={(layout) => {
                updateSettings(settings.set(lessonProps.music.layout, layout));
              }}
            />
          </Field>
        </FieldList>
      </FieldSet>
      <Explainer>
        <Description>
          <FormattedMessage
            id="settings.music.layout.description"
            defaultMessage="Choose which hand and bellows direction to practice. Notes and highlights are limited to the selected keyboard layout."
          />
        </Description>
      </Explainer>
    </>
  );
}
