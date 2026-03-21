import { KeyboardProvider } from "@keybr/keyboard";
import { Screen } from "@keybr/pages-shared";
import { SettingsContext, useSettings } from "@keybr/settings";
import { TypingSettings } from "@keybr/textinput-ui";
import {
  Button,
  ExplainerBoundary,
  Field,
  FieldList,
  Header,
  Icon,
  Spacer,
  useView,
} from "@keybr/widget";
import { mdiCheckCircle, mdiDeleteForever } from "@mdi/js";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { views } from "../views.tsx";
import { ExplainSettings } from "./ExplainSettings.tsx";
import { KeyboardSettings } from "./KeyboardSettings.tsx";
import { LessonSettings } from "./LessonSettings.tsx";
import { MiscSettings } from "./MiscSettings.tsx";
import * as styles from "./SettingsScreen.module.less";

export function SettingsScreen({
  mode = "practice",
}: {
  readonly mode?: "practice" | "music";
}) {
  const { settings, updateSettings } = useSettings();
  const { setView } = useView(views);
  const [newSettings, updateNewSettings] = useState(settings);
  return (
    <SettingsContext.Provider
      value={{
        settings: newSettings,
        updateSettings: updateNewSettings,
      }}
    >
      <KeyboardProvider>
        <Content
          mode={mode}
          onSubmit={() => {
            updateSettings(newSettings);
            setView(mode);
          }}
        />
      </KeyboardProvider>
    </SettingsContext.Provider>
  );
}

function Content({
  mode,
  onSubmit,
}: {
  readonly mode: "practice" | "music";
  readonly onSubmit: () => void;
}) {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const musicMode = mode === "music";
  return (
    <Screen>
      <ExplainerBoundary>
        <ExplainSettings />
        {musicMode ? (
          <>
            <Header level={1}>
              <FormattedMessage
                id="settings.music.instrument"
                defaultMessage="Instrument"
              />
            </Header>
            <KeyboardSettings mode="music" />
          </>
        ) : (
          <>
            <Header level={1}>
              <FormattedMessage id="t_Lessons" defaultMessage="Lessons" />
            </Header>
            <LessonSettings />

            <Spacer size={5} />

            <Header level={1}>
              <FormattedMessage id="t_Typing" defaultMessage="Typing" />
            </Header>
            <TypingSettings />

            <Spacer size={5} />

            <Header level={1}>
              <FormattedMessage id="t_Keyboard" defaultMessage="Keyboard" />
            </Header>
            <KeyboardSettings mode={mode} />

            <Spacer size={5} />

            <Header level={1}>
              <FormattedMessage
                id="t_Miscellaneous"
                defaultMessage="Miscellaneous"
              />
            </Header>
            <MiscSettings />
          </>
        )}

        <div className={styles.footer}>
          <FieldList>
            <Field>
              <Button
                size={16}
                icon={<Icon shape={mdiDeleteForever} />}
                label={formatMessage({
                  id: "t_Reset",
                  defaultMessage: "Reset",
                })}
                onClick={() => {
                  updateSettings(settings.reset());
                }}
              />
            </Field>
            <Field.Filler />
            <Field>
              <Button
                size={16}
                icon={<Icon shape={mdiCheckCircle} />}
                label={formatMessage({
                  id: "t_Done",
                  defaultMessage: "Done",
                })}
                onClick={() => {
                  onSubmit();
                }}
              />
            </Field>
          </FieldList>
        </div>
      </ExplainerBoundary>
    </Screen>
  );
}
