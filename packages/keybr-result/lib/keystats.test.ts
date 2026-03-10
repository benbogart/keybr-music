import { test } from "node:test";
import { Letter } from "@keybr/phonetic-model";
import { Histogram } from "@keybr/textinput";
import { deepEqual } from "rich-assert";
import { ResultFaker } from "./fake.tsx";
import { MutableKeyStatsMap } from "./keystats.ts";

test("compute key stats", () => {
  const faker = new ResultFaker();
  const l1 = new Letter(0x0061, 1, "A");
  const l2 = new Letter(0x0062, 1, "B");
  const r1 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
      },
    ]),
  });
  const r2 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l2.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
      },
    ]),
  });
  const r3 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: l1.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
      },
    ]),
  });

  const keyStatsMap = new MutableKeyStatsMap([l1, l2]);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [],
    timeToType: null,
    bestTimeToType: null,
  });

  keyStatsMap.append(r1);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
    ],
    timeToType: 500,
    bestTimeToType: 500,
  });

  keyStatsMap.append(r2);
  keyStatsMap.append(r3);

  deepEqual(keyStatsMap.copy().get(l1), {
    letter: l1,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 500,
        filteredTimeToType: 500,
      },
      {
        index: 2,
        timeStamp: r3.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 100,
        filteredTimeToType: 460,
      },
    ],
    timeToType: 460,
    bestTimeToType: 460,
  });

  deepEqual(keyStatsMap.copy().get(l2), {
    letter: l2,
    samples: [
      {
        index: 1,
        timeStamp: r2.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 200,
        filteredTimeToType: 200,
      },
    ],
    timeToType: 200,
    bestTimeToType: 200,
  });
});

test("compute key stats for midi note letters", () => {
  const faker = new ResultFaker();
  const c4 = new Letter(60, 1, "C4");
  const d4 = new Letter(62, 1, "D4");
  const r1 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: c4.codePoint,
        hitCount: 2,
        missCount: 0,
        timeToType: 400,
      },
    ]),
  });
  const r2 = faker.nextResult({
    histogram: new Histogram([
      {
        codePoint: c4.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 600,
      },
      {
        codePoint: d4.codePoint,
        hitCount: 1,
        missCount: 0,
        timeToType: 300,
      },
    ]),
  });

  const keyStatsMap = new MutableKeyStatsMap([c4, d4]);
  keyStatsMap.append(r1);
  keyStatsMap.append(r2);

  deepEqual(keyStatsMap.copy().get(c4), {
    letter: c4,
    samples: [
      {
        index: 0,
        timeStamp: r1.timeStamp,
        hitCount: 2,
        missCount: 0,
        timeToType: 400,
        filteredTimeToType: 400,
      },
      {
        index: 1,
        timeStamp: r2.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 600,
        filteredTimeToType: 420,
      },
    ],
    timeToType: 420,
    bestTimeToType: 400,
  });

  deepEqual(keyStatsMap.copy().get(d4), {
    letter: d4,
    samples: [
      {
        index: 1,
        timeStamp: r2.timeStamp,
        hitCount: 1,
        missCount: 0,
        timeToType: 300,
        filteredTimeToType: 300,
      },
    ],
    timeToType: 300,
    bestTimeToType: 300,
  });
});
