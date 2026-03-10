import { KeyFrequencyHeatmap, Marker } from "@keybr/chart";
import { useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { FormattedMessage } from "react-intl";

export function KeyFrequencyHeatmapSection({
  keyStatsMap,
}: {
  keyStatsMap: KeyStatsMap;
}) {
  const keyboard = useKeyboard();
  const isBandoneon = keyboard.layout.family === "bandoneon";
  return (
    <Figure>
      <Figure.Caption>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.noteFrequencyHeatmap.caption"
            defaultMessage="Note Frequency Heatmap"
          />
        ) : (
          <FormattedMessage
            id="profile.chart.keyFrequencyHeatmap.caption"
            defaultMessage="Key Frequency Heatmap"
          />
        )}
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          {isBandoneon ? (
            <FormattedMessage
              id="profile.chart.noteFrequencyHeatmap.description"
              defaultMessage="This chart shows relative note frequencies as a heatmap."
            />
          ) : (
            <FormattedMessage
              id="profile.chart.keyFrequencyHeatmap.description"
              defaultMessage="This chart shows relative key frequencies as a heatmap."
            />
          )}
        </Figure.Description>
      </Explainer>

      {isBandoneon ? (
        <MusicNoteHeatmap keyStatsMap={keyStatsMap} />
      ) : (
        <KeyFrequencyHeatmap keyStatsMap={keyStatsMap} keyboard={keyboard} />
      )}

      <Figure.Legend>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.noteFrequencyHeatmap.legend"
            defaultMessage="Cell color: {label1} – more notes played, {label2} – more errors."
            values={{
              label1: <Marker type="histogram-h" />,
              label2: <Marker type="histogram-m" />,
            }}
          />
        ) : (
          <FormattedMessage
            id="profile.chart.keyFrequencyHeatmap.legend"
            defaultMessage="Circle color: {label1} – hit count, {label2} – miss count."
            values={{
              label1: <Marker type="histogram-h" />,
              label2: <Marker type="histogram-m" />,
            }}
          />
        )}
      </Figure.Legend>
    </Figure>
  );
}

function MusicNoteHeatmap({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}) {
  const items = keyStatsMap.letters.map((letter) => {
    const { samples } = keyStatsMap.get(letter);
    let hit = 0;
    let miss = 0;
    for (const sample of samples) {
      hit += sample.hitCount;
      miss += sample.missCount;
    }
    return { label: letter.label, hit, miss, total: hit + miss };
  });
  const maxTotal = Math.max(...items.map((item) => item.total), 1);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(5rem, 1fr))",
        gap: "0.6rem",
      }}
    >
      {items.map((item) => {
        const intensity = item.total / maxTotal;
        const missRatio = item.total > 0 ? item.miss / item.total : 0;
        const hue = Math.round(120 * (1 - missRatio));
        const lightness = Math.round(92 - intensity * 40);
        return (
          <span
            key={item.label}
            title={`${item.label}: ${item.hit} hits, ${item.miss} misses`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "3.8rem",
              borderRadius: "0.6rem",
              border: "var(--separator-border)",
              fontFamily: "var(--monospace-font-family)",
              fontWeight: 600,
              background: `hsl(${hue} 70% ${lightness}%)`,
            }}
          >
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
