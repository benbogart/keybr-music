import { KeyboardOptions, Layout } from "@keybr/keyboard";
import { Settings } from "@keybr/settings";
import { ViewSwitch } from "@keybr/widget";
import { musicFirstViews, views } from "./views.tsx";

setDefaultLayout(window.navigator.language);

function setDefaultLayout(localeId: string) {
  const layout = Layout.findLayout(localeId);
  if (layout != null) {
    Settings.addDefaults(
      KeyboardOptions.default()
        .withLanguage(layout.language)
        .withLayout(layout)
        .save(new Settings()),
    );
  }
}

export function PracticePage({
  defaultMode = "music",
}: {
  readonly defaultMode?: "typing" | "music";
}) {
  return (
    <ViewSwitch views={defaultMode === "music" ? musicFirstViews : views} />
  );
}
