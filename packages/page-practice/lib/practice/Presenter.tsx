import { type KeyId } from "@keybr/keyboard";
import { names } from "@keybr/lesson-ui";
import { Screen } from "@keybr/pages-shared";
import { enumProp, Preferences } from "@keybr/settings";
import { type LineList, makeStats } from "@keybr/textinput";
import {
  type IInputEvent,
  type IKeyboardEvent,
  ModifierState,
} from "@keybr/textinput-events";
import { TextArea, type TextAreaEventsComponent } from "@keybr/textinput-ui";
import { type Focusable, Zoomer } from "@keybr/widget";
import { createRef, PureComponent, type ReactNode } from "react";
import { Controls } from "./Controls.tsx";
import { Indicators } from "./Indicators.tsx";
import { DeferredKeyboardPresenter } from "./KeyboardPresenter.tsx";
import { PracticeTour } from "./PracticeTour.tsx";
import * as styles from "./Presenter.module.less";
import { type LessonState } from "./state/index.ts";

type Props = {
  readonly state: LessonState;
  readonly lines: LineList;
  readonly depressedKeys: readonly KeyId[];
  readonly musicMode?: boolean;
  readonly eventsComponent?: TextAreaEventsComponent;
  readonly onResetLesson: () => void;
  readonly onSkipLesson: () => void;
  readonly onKeyDown: (ev: IKeyboardEvent) => void;
  readonly onKeyUp: (ev: IKeyboardEvent) => void;
  readonly onInput: (ev: IInputEvent) => void;
};

type State = {
  readonly view: View;
  readonly tour: boolean;
  readonly focus: boolean;
};

enum View {
  Normal = 1,
  Compact = 2,
  Bare = 3,
}

function getNextView(view: View, musicMode = false): View {
  switch (view) {
    case View.Normal:
      return View.Compact;
    case View.Compact:
      return View.Bare;
    case View.Bare:
      return musicMode ? View.Compact : View.Normal;
  }
}

const propView = enumProp("prefs.practice.view", View, View.Normal);

export class Presenter extends PureComponent<Props, State> {
  readonly focusRef = createRef<Focusable>();

  override state: State = {
    view: Preferences.get(propView),
    tour: false,
    focus: false,
  };

  override componentDidMount() {
    if (this.props.musicMode) {
      const view = this.state.view;
      if (view === View.Normal) {
        this.setState({ view: View.Compact });
      }
    } else if (this.props.state.settings.isNew) {
      this.setState({
        view: View.Normal,
        tour: true,
      });
    }
  }

  override render() {
    const {
      props: {
        state,
        lines,
        depressedKeys,
        eventsComponent,
        musicMode = false,
      },
      state: { view, tour, focus },
      handleResetLesson,
      handleSkipLesson,
      handleKeyDown,
      handleKeyUp,
      handleInput,
      handleFocus,
      handleBlur,
      handleChangeView,
      handleHelp,
      handleTourClose,
    } = this;
    const activeView = musicMode && view === View.Normal ? View.Compact : view;
    switch (activeView) {
      case View.Normal:
        return (
          <NormalLayout
            state={state}
            focus={tour || focus}
            depressedKeys={depressedKeys}
            toggledKeys={ModifierState.modifiers}
            controls={
              <Controls
                musicMode={musicMode}
                showHelp={!musicMode}
                showChangeView={true}
                onChangeView={handleChangeView}
                onResetLesson={handleResetLesson}
                onSkipLesson={handleSkipLesson}
                onHelp={handleHelp}
              />
            }
            textInput={
              <Zoomer id="TextArea/Normal">
                <TextArea
                  focusRef={this.focusRef}
                  settings={state.textDisplaySettings}
                  lines={lines}
                  displayMode={musicMode ? "staff" : "text"}
                  size="X0"
                  demo={tour}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onInput={handleInput}
                  eventsComponent={eventsComponent}
                />
              </Zoomer>
            }
            tour={tour && <PracticeTour onClose={handleTourClose} />}
          />
        );
      case View.Compact:
        return (
          <CompactLayout
            state={state}
            focus={tour || focus}
            depressedKeys={depressedKeys}
            controls={
              <Controls
                musicMode={musicMode}
                showHelp={!musicMode}
                showChangeView={true}
                onChangeView={handleChangeView}
                onResetLesson={handleResetLesson}
                onSkipLesson={handleSkipLesson}
                onHelp={handleHelp}
              />
            }
            textInput={
              <Zoomer id="TextArea/Compact">
                <TextArea
                  focusRef={this.focusRef}
                  settings={state.textDisplaySettings}
                  lines={lines}
                  displayMode={musicMode ? "staff" : "text"}
                  size="X1"
                  demo={tour}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onInput={handleInput}
                  eventsComponent={eventsComponent}
                />
              </Zoomer>
            }
          />
        );
      case View.Bare:
        return (
          <BareLayout
            state={state}
            musicMode={musicMode}
            focus={tour || focus}
            depressedKeys={depressedKeys}
            controls={
              <Controls
                musicMode={musicMode}
                showHelp={!musicMode}
                showChangeView={true}
                onChangeView={handleChangeView}
                onResetLesson={handleResetLesson}
                onSkipLesson={handleSkipLesson}
                onHelp={handleHelp}
              />
            }
            textInput={
              <Zoomer id="TextArea/Bare">
                <TextArea
                  focusRef={this.focusRef}
                  settings={state.textDisplaySettings}
                  lines={lines}
                  displayMode={musicMode ? "staff" : "text"}
                  size="X2"
                  demo={tour}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onInput={handleInput}
                  eventsComponent={eventsComponent}
                />
              </Zoomer>
            }
          />
        );
    }
  }

  handleResetLesson = () => {
    this.props.onResetLesson();
    this.focusRef.current?.focus();
  };

  handleSkipLesson = () => {
    this.props.onSkipLesson();
    this.focusRef.current?.focus();
  };

  handleKeyDown = (ev: IKeyboardEvent) => {
    if (this.state.focus) {
      this.props.onKeyDown(ev);
    }
  };

  handleKeyUp = (ev: IKeyboardEvent) => {
    if (this.state.focus) {
      this.props.onKeyUp(ev);
    }
  };

  handleInput = (ev: IInputEvent) => {
    if (this.state.focus) {
      this.props.onInput(ev);
    }
  };

  handleFocus = () => {
    this.setState(
      {
        focus: true,
      },
      () => {
        this.props.onResetLesson();
      },
    );
  };

  handleBlur = () => {
    this.setState(
      {
        focus: false,
      },
      () => {
        this.props.onResetLesson();
      },
    );
  };

  handleChangeView = () => {
    this.setState(
      ({ view }) => {
        const nextView = getNextView(view, this.props.musicMode);
        Preferences.set(propView, nextView);
        return { view: nextView };
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.focus();
      },
    );
  };

  handleHelp = () => {
    if (this.props.musicMode) {
      return;
    }
    this.setState(
      {
        view: View.Normal,
        tour: true,
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.blur();
      },
    );
  };

  handleTourClose = () => {
    this.setState(
      {
        view: View.Normal,
        tour: false,
      },
      () => {
        this.props.onResetLesson();
        this.focusRef.current?.focus();
      },
    );
  };
}

function NormalLayout({
  state,
  focus,
  depressedKeys,
  toggledKeys,
  controls,
  textInput,
  tour,
}: {
  readonly state: LessonState;
  readonly focus: boolean;
  readonly depressedKeys: readonly string[];
  readonly toggledKeys: readonly string[];
  readonly controls: ReactNode;
  readonly textInput: ReactNode;
  readonly tour: ReactNode;
}) {
  return (
    <Screen>
      <Indicators state={state} />
      <div id={names.textInput} className={styles.textInput_normal}>
        {textInput}
      </div>
      <div id={names.keyboard} className={styles.keyboard}>
        <Zoomer id="Keyboard/Normal">
          <DeferredKeyboardPresenter
            focus={focus}
            depressedKeys={depressedKeys}
            toggledKeys={toggledKeys}
            suffix={state.suffix}
            lastLesson={state.lastLesson}
          />
        </Zoomer>
      </div>
      {controls}
      {tour}
    </Screen>
  );
}

function CompactLayout({
  state,
  controls,
  textInput,
}: {
  readonly state: LessonState;
  readonly focus: boolean;
  readonly depressedKeys: readonly string[];
  readonly controls: ReactNode;
  readonly textInput: ReactNode;
}) {
  return (
    <Screen>
      <Indicators state={state} />
      <div id={names.textInput} className={styles.textInput_compact}>
        {textInput}
      </div>
      {controls}
    </Screen>
  );
}

function BareLayout({
  state,
  musicMode,
  controls,
  textInput,
}: {
  readonly state: LessonState;
  readonly musicMode?: boolean;
  readonly focus: boolean;
  readonly depressedKeys: readonly string[];
  readonly controls: ReactNode;
  readonly textInput: ReactNode;
}) {
  const { speed: liveSpeed } = makeStats(state.textInput.steps);
  const notesPerMinute = Math.round(
    liveSpeed || state.lastLesson?.result.speed || 0,
  );
  return (
    <Screen>
      {musicMode && (
        <div className={styles.musicStats}>
          <span className={styles.musicStats_label}>Notes per minute</span>
          <span className={styles.musicStats_value}>{notesPerMinute}</span>
        </div>
      )}
      <div id={names.textInput} className={styles.textInput_bare}>
        {textInput}
      </div>
      {controls}
    </Screen>
  );
}
