import { KeyLegendList, names } from "@keybr/lesson-ui";
import { Slide, Tour } from "@keybr/widget";
import { memo } from "react";
import { FormattedMessage } from "react-intl";

export const PracticeTour = memo(function PracticeTour({
  onClose,
}: {
  readonly onClose?: () => void;
}) {
  return (
    <Tour onClose={onClose}>
      <Slide size="large">
        <FormattedMessage
          id="m_tour01"
          defaultMessage={
            "<h1>Practice Bandoneon</h1>" +
            "<p>This tool applies the same methodology used by <a>keybr</a> — a proven touch-typing trainer — to the bandoneon. The hypothesis: the progressive, spaced-repetition approach that builds muscle memory for keyboard layouts can do the same for bandoneon button positions.</p>" +
            "<p>This is an experiment. The software was built by autonomous AI agents. Whether this methodology actually improves bandoneon accuracy and speed is genuinely untested. You’re helping us find out.</p>" +
            "<p>Use the left and right arrow keys to navigate through these slides.</p>"
          }
          values={{
            a: (chunks) => <a href="https://www.keybr.com">{chunks}</a>,
          }}
        />
      </Slide>
      <Slide size="large">
        <FormattedMessage
          id="m_tour02"
          defaultMessage={
            "<p>The system starts you with a small set of notes and tracks how quickly and accurately you play each one.</p>" +
            "<p>Notes you’re slow on get more practice. As your weakest notes improve, new notes are added to your set. Over time, this evens out your ability across the full keyboard and should enable greater overall speed.</p>" +
            "<p>This does <em>not</em> train rhythm. For that, practice with a metronome. This tool focuses purely on pitch accuracy and note-finding speed.</p>"
          }
        />
      </Slide>
      <Slide size="small" anchor={`#${names.textInput}`} position="block-end">
        <FormattedMessage
          id="m_tour03"
          defaultMessage="<p>This is the staff display. It shows the notes you need to play. Play each note into your microphone — the system listens for pitch, not rhythm. The notes change with each new lesson and are generated from your current note set.</p>"
        />
      </Slide>
      <Slide size="small" anchor={`#${names.keyboard}`} position="block-start">
        <FormattedMessage
          id="m_tour04"
          defaultMessage="<p>This is the bandoneon keyboard. It shows both hands and highlights the note you need to play. Use it as a visual reference to find button positions — the goal is to eventually find them without looking.</p>"
        />
      </Slide>
      <Slide size="small" anchor={`#${names.speed}`} position="block-end">
        <FormattedMessage
          id="m_tour05"
          defaultMessage="<p>These gauges show your performance for the current lesson. <em>Speed</em> is measured in notes per minute. <em>Accuracy</em> is the percentage of notes you played correctly on the first attempt. <em>Score</em> combines both — you can’t get a high score by playing fast with lots of mistakes.</p>"
        />
      </Slide>
      <Slide size="small" anchor={`#${names.keySet}`} position="block-end">
        <FormattedMessage
          id="m_tour06"
          defaultMessage="<p>This shows your current set of practice notes and your confidence level for each one. As your confidence grows on existing notes, new ones are added. The colors indicate how well you know each note:</p>"
        />
        <KeyLegendList />
      </Slide>
      <Slide size="small" anchor={`#${names.currentKey}`} position="block-end">
        <FormattedMessage
          id="m_tour07"
          defaultMessage={
            "<p>This shows details about the note currently getting extra focus — it appears more frequently in your lessons until your confidence with it improves:</p>" +
            "<dl>" +
            "<dt>Best speed</dt>" +
            "<dd>Your fastest recorded speed for this individual note.</dd>" +
            "<dt>Confidence level</dt>" +
            "<dd>A value from zero to one based on your speed with this note. The note is considered learned when confidence reaches one.</dd>" +
            "<dt>Learning rate</dt>" +
            "<dd>How your speed on this note is changing across lessons.</dd>" +
            "</dl>"
          }
        />
      </Slide>
    </Tour>
  );
});
