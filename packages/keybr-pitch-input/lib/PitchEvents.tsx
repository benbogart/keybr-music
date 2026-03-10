import { type Focusable } from "@keybr/widget";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  PitchInputHandler,
  type PitchInputHandlerOptions,
} from "./inputhandler.ts";
import { type Callbacks } from "./types.ts";

export const PitchEvents = memo(function PitchEvents({
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  onInput,
  focusRef,
  options,
}: Callbacks & {
  readonly focusRef?: RefObject<Focusable | null>;
  readonly options?: PitchInputHandlerOptions;
}): ReactNode {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handler = usePitchInputHandler(options);
  useImperativeHandle(focusRef, () => ({
    focus() {
      inputRef.current?.focus();
    },
    blur() {
      inputRef.current?.blur();
    },
  }));
  useEffect(() => {
    const input = inputRef.current;
    if (input == null) {
      return;
    }
    const handleFocus = () => {
      void handler.start();
    };
    const handleBlur = () => {
      handler.stop();
    };
    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);
    return () => {
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("blur", handleBlur);
      handler.stop();
    };
  }, [handler]);
  handler.setCallbacks({ onFocus, onBlur, onKeyDown, onKeyUp, onInput });
  return (
    <div style={divStyle}>
      <textarea
        ref={inputRef}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        style={inputStyle}
      />
    </div>
  );
});

function usePitchInputHandler(options: PitchInputHandlerOptions = {}) {
  const handlerRef = useRef<PitchInputHandler | null>(null);
  let handler = handlerRef.current;
  if (handler == null) {
    handlerRef.current = handler = new PitchInputHandler(options);
  }
  return handler;
}

const divStyle = {
  position: "absolute",
  insetInlineStart: "0px",
  insetBlockStart: "0px",
  inlineSize: "0px",
  blockSize: "0px",
  overflow: "hidden",
} satisfies CSSProperties;

const inputStyle = {
  display: "block",
  margin: "0px",
  padding: "0px",
  inlineSize: "1em",
  blockSize: "1em",
  border: "none",
  outline: "none",
} satisfies CSSProperties;
