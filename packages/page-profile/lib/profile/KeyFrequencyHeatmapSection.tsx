import { KeyFrequencyHeatmap, Marker } from "@keybr/chart";
import { bandoneonKeyPositions, SVG_VIEWBOX } from "@keybr/instrument";
import { useKeyboard } from "@keybr/keyboard";
import { type KeyStatsMap } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { type ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import bandoneonSvg from "../../../keybr-instrument/assets/bandoneon-right-opening.svg";

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
              defaultMessage="This chart shows relative note frequencies as a heatmap on the bandoneon layout."
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
        <BandoneonHeatmap keyStatsMap={keyStatsMap} />
      ) : (
        <KeyFrequencyHeatmap keyStatsMap={keyStatsMap} keyboard={keyboard} />
      )}

      <Figure.Legend>
        {isBandoneon ? (
          <FormattedMessage
            id="profile.chart.noteFrequencyHeatmap.legend"
            defaultMessage="Circle size: relative frequency. Circle color: {label1} – hit count, {label2} – miss count."
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

const MIN_RADIUS = 5;
const MAX_RADIUS = 15;

function BandoneonHeatmap({
  keyStatsMap,
}: {
  readonly keyStatsMap: KeyStatsMap;
}): ReactNode {
  type Item = {
    readonly codePoint: number;
    readonly x: number;
    readonly y: number;
    readonly hit: number;
    readonly miss: number;
  };

  const items: Item[] = [];
  for (const letter of keyStatsMap.letters) {
    const pos = bandoneonKeyPositions.get(letter.codePoint);
    if (pos == null) continue;
    const { samples } = keyStatsMap.get(letter);
    let hit = 0;
    let miss = 0;
    for (const sample of samples) {
      hit += sample.hitCount;
      miss += sample.missCount;
    }
    if (hit > 0 || miss > 0) {
      items.push({
        codePoint: letter.codePoint,
        x: pos.x,
        y: pos.y,
        hit,
        miss,
      });
    }
  }

  const maxHit = Math.max(...items.map((it) => it.hit), 1);
  const maxMiss = Math.max(...items.map((it) => it.miss), 1);

  return (
    <div
      style={{
        position: "relative",
        maxInlineSize: "72rem",
        marginInline: "auto",
      }}
    >
      <img
        src={bandoneonSvg}
        alt="Bandoneon right hand opening keyboard"
        style={{ display: "block", inlineSize: "100%", blockSize: "auto" }}
      />
      <svg
        viewBox={SVG_VIEWBOX}
        style={{
          position: "absolute",
          inset: 0,
          inlineSize: "100%",
          blockSize: "100%",
          pointerEvents: "none",
        }}
      >
        {items.map((item) => {
          const hitR =
            MIN_RADIUS + (item.hit / maxHit) * (MAX_RADIUS - MIN_RADIUS);
          return (
            <path
              key={`h-${item.codePoint}`}
              d={semicircle(item.x, item.y, hitR, "left")}
              style={{ fill: "var(--Chart-hist-h__color)", opacity: 0.7 }}
            />
          );
        })}
        {items
          .filter((item) => item.miss > 0)
          .map((item) => {
            const missR =
              MIN_RADIUS + (item.miss / maxMiss) * (MAX_RADIUS - MIN_RADIUS);
            return (
              <path
                key={`m-${item.codePoint}`}
                d={semicircle(item.x, item.y, missR, "right")}
                style={{ fill: "var(--Chart-hist-m__color)", opacity: 0.7 }}
              />
            );
          })}
      </svg>
    </div>
  );
}

/** SVG arc path for a semicircle (left = top-left half, right = bottom-right half). */
function semicircle(
  cx: number,
  cy: number,
  r: number,
  half: "left" | "right",
): string {
  if (half === "left") {
    return `M ${cx - r} ${cy + r} A${r} ${r} 0 0 1 ${cx + r} ${cy - r}`;
  }
  return `M ${cx - r} ${cy + r} A${r} ${r} 0 0 0 ${cx + r} ${cy - r}`;
}
