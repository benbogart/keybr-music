import { type InputListener } from "@keybr/textinput-events";

export type Callbacks = {
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
} & Partial<InputListener>;
