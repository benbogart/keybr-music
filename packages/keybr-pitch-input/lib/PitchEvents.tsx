import { type Focusable } from "@keybr/widget";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  PitchInputHandler,
  type PitchInputHandlerOptions,
} from "./inputhandler.ts";
import { type Callbacks } from "./types.ts";

function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const runtime = globalThis as {
    process?: { versions?: { node?: string } };
  };
  if (runtime.process?.versions?.node == null) {
    return;
  }
  void import("node:fs")
    .then(({ appendFileSync }) => {
      appendFileSync(
        "/opt/cursor/logs/debug.log",
        JSON.stringify({
          hypothesisId,
          location,
          message,
          data,
          timestamp: Date.now(),
        }) + "\n",
      );
    })
    .catch(() => {});
}

function countIterable(
  values: Iterable<unknown> | null | undefined,
): number | null {
  if (values == null) {
    return null;
  }
  let count = 0;
  for (const _ of values) {
    void _;
    count += 1;
  }
  return count;
}

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
  const previousRef = useRef<PitchInputHandler | null>(null);
  const handler = useMemo(() => {
    const nextHandler = new PitchInputHandler(options);
    const previousHandler = previousRef.current;
    previousRef.current = nextHandler;
    // #region agent log
    agentDebugLog("A", "PitchEvents.tsx:106", "created pitch handler", {
      adapterValidMidiNotesCount: countIterable(options.validMidiNotes),
      detectorValidMidiNotesCount: countIterable(
        options.detectorOptions?.validMidiNotes,
      ),
    });
    // #endregion
    if (previousHandler != null) {
      // #region agent log
      agentDebugLog("A", "PitchEvents.tsx:115", "replaced pitch handler", {
        adapterValidMidiNotesCount: countIterable(options.validMidiNotes),
        detectorValidMidiNotesCount: countIterable(
          options.detectorOptions?.validMidiNotes,
        ),
      });
      // #endregion
    } else {
      // #region agent log
      agentDebugLog(
        "A",
        "PitchEvents.tsx:124",
        "first pitch handler instance",
        {
          adapterValidMidiNotesCount: countIterable(options.validMidiNotes),
          detectorValidMidiNotesCount: countIterable(
            options.detectorOptions?.validMidiNotes,
          ),
        },
      );
      // #endregion
    }
    previousHandler?.stop();
    return nextHandler;
  }, [options]);
  useEffect(() => {
    return () => {
      previousRef.current?.stop();
      previousRef.current = null;
    };
  }, []);
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
