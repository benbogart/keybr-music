import { PracticeScreen } from "./practice/PracticeScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";

export const views = {
  practice: PracticeScreen,
  music: () => <PracticeScreen mode="music" />,
  settings: SettingsScreen,
} as const;
