import { PracticeScreen } from "./practice/PracticeScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";

export const views = {
  practice: PracticeScreen,
  music: () => <PracticeScreen mode="music" />,
  settings: SettingsScreen,
} as const;

export const musicFirstViews = {
  music: views.music,
  practice: views.practice,
  settings: views.settings,
} as const;
