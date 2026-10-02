// The curriculum. Stages → units → lessons → exercises.
// Lesson text is written for a complete beginner; drills reuse the same
// generated charts the teaching cards show, so what is taught is what is tested.

import type { Lesson, Stage } from "@/lib/types";

// ---------- Stage 1: Reading charts ----------

const l1_1: Lesson = {
  id: "s1-what-is-a-chart",
  title: "What a chart shows",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "axes",
      title: "Price over time",
      body: [
        "A price chart has two axes. The bottom axis is time, moving left to right. The right axis is price.",
        "Every bar on this chart is one day of trading. The newest bar is on the far right. That's where you are right now; everything to its left already happened.",
        "Your whole job as a trader is to read what the left side is telling you about the right edge.",
      ],
      chart: { seed: 11, structure: "bull", bars: 40 },
    },
    {
      id: "q1",
      type: "choice",
      tag: "axes",
      prompt: "On a price chart, where is the most recent price?",
      choices: ["Far left", "Far right", "At the top", "In the middle"],
      answer: 1,
      explain: "Time runs left to right, so the newest bar is always on the right edge.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "axes",
      prompt: "What does the vertical (right-hand) axis show?",
      choices: ["Time", "Volume", "Price", "Number of trades"],
      answer: 2,
      explain: "Up means a higher price, down means lower. Time is on the bottom axis.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "axes",
      prompt: "Looking at this chart, did price finish higher or lower than it started?",
      choices: ["Higher", "Lower", "The same"],
      answer: 0,
      explain: "The right edge sits well above the left edge. Over this window, price went up.",
      chart: { seed: 11, structure: "bull", bars: 40 },
    },
  ],
};

const l1_2: Lesson = {
  id: "s1-timeframes",
  title: "Timeframes and scale",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "timeframes",
      title: "Always know what scale you're on",
      body: [
        "The same stock can be shown with each bar meaning one minute, one hour, four hours, one day, or one week. That is the timeframe.",
        "A 5-minute chart can look like a crash while the daily chart is in a calm uptrend. Neither is wrong; they're different scales.",
        "Rule: always know what scale you're currently on. Before you judge a chart, check the timeframe.",
      ],
    },
    {
      id: "t2",
      type: "teach",
      tag: "timeframes",
      title: "Enough history",
      body: [
        "Before entering a trade, make sure you're looking at enough price history. A decision made from ten bars is a guess.",
        "On a phone, if you can't fit enough history on the screen, switch to a larger timeframe instead of squinting at a tiny window.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "timeframes",
      prompt: "On a 4-hour chart, how much trading does one candle represent?",
      choices: ["4 minutes", "4 hours", "4 days", "4 trades"],
      answer: 1,
      explain: "The timeframe names how long each candle lasts.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "timeframes",
      prompt: "You're on your phone and the 15-minute chart only fits an hour of history. What should you do?",
      choices: [
        "Trade anyway, the last hour is what matters",
        "Zoom in further",
        "Switch to a larger timeframe to see more history",
        "Guess the trend from the last candle",
      ],
      answer: 2,
      explain: "Not enough history means no decision. A larger timeframe fits more of the story on screen.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "timeframes",
      prompt: "Which timeframe shows the bigger picture?",
      choices: ["1-minute", "15-minute", "1-hour", "Daily"],
      answer: 3,
      explain: "Larger timeframes compress more time into each bar, so the daily shows the widest view.",
    },
  ],
};

const l1_3: Lesson = {
  id: "s1-checkpoint",
  title: "Checkpoint: Reading charts",
  checkpoint: true,
  exercises: [
    {
      id: "q1",
      type: "choice",
      tag: "axes",
      prompt: "Did price finish higher or lower than it started?",
      choices: ["Higher", "Lower"],
      answer: 1,
      explain: "The right edge is below the left edge: price went down over this window.",
      chart: { seed: 23, structure: "bear", bars: 40 },
    },
    {
      id: "q2",
      type: "choice",
      tag: "timeframes",
      prompt: "A friend says 'the stock is crashing' while looking at a 1-minute chart. The daily chart is in a steady uptrend. Who's right?",
      choices: [
        "Your friend, the newest timeframe is the truth",
        "Both describe different scales; neither is wrong",
        "The daily chart, small timeframes don't matter",
      ],
      answer: 1,
      explain: "Both are real. What matters is knowing which scale your trade lives on.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "timeframes",
      prompt: "Before judging a chart, the first thing to check is:",
      choices: ["The news", "The timeframe", "The colour of the last candle", "The volume"],
      answer: 1,
      explain: "Always know what scale you're on. Everything else follows from that.",
    },
    {
      id: "q4",
      type: "choice",
      tag: "axes",
      prompt: "Where would tomorrow's candle appear on this chart?",
      choices: ["Left of the first candle", "Right of the last candle", "Above the highest candle"],
      answer: 1,
      explain: "New time is always added on the right.",
      chart: { seed: 23, structure: "bear", bars: 40 },
    },
  ],
};

// ---------- Stage 2: Candles ----------

const l2_1: Lesson = {
  id: "s2-anatomy",
  title: "Anatomy of a candle",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "candle-anatomy",
      title: "Four prices in one shape",
      body: [
        "Each candle records four prices for its period: the open, the high, the low, and the close.",
        "The thick part is the body: it runs from open to close. The thin lines above and below are the wicks: they reach the high and the low.",
        "Green (or white) means it closed above where it opened: buyers won that period. Red means it closed below the open: sellers won.",
      ],
    },
    {
      id: "c1",
      type: "tap-candle",
      tag: "candle-anatomy",
      prompt: "Tap the body of this candle.",
      bullish: true,
      answer: "body",
      explain: "The body is the thick part between the open and the close.",
    },
    {
      id: "c2",
      type: "tap-candle",
      tag: "candle-anatomy",
      prompt: "Tap the upper wick: the part showing the highest price reached.",
      bullish: false,
      answer: "upper-wick",
      explain: "The upper wick runs from the top of the body to the high.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "candle-anatomy",
      prompt: "A green candle means:",
      choices: [
        "Price closed above where it opened",
        "Price closed below where it opened",
        "Price didn't move",
        "Volume was high",
      ],
      answer: 0,
      explain: "Green: close above open. Buyers were in control for that period.",
    },
    {
      id: "c3",
      type: "tap-candle",
      tag: "candle-anatomy",
      prompt: "Tap the lower wick: the part showing the lowest price reached.",
      bullish: true,
      answer: "lower-wick",
      explain: "The lower wick runs from the bottom of the body down to the low.",
    },
  ],
};

const l2_2: Lesson = {
  id: "s2-wicks",
  title: "What wicks tell you",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "candle-patterns",
      title: "A wick is a failed move",
      body: [
        "A long upper wick means price pushed up during the period but couldn't hold it: sellers pushed it back down before the close.",
        "A long lower wick is the opposite: sellers pushed down, buyers took it back.",
        "A string of candles with long lower wicks at the same price is buyers repeatedly defending that level. That can act as a rejection level.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "candle-patterns",
      prompt: "A candle with a tiny body and a very long upper wick tells you:",
      choices: [
        "Buyers pushed up and held it",
        "Buyers pushed up but sellers took it back",
        "Nothing happened",
        "The market was closed",
      ],
      answer: 1,
      explain: "The high was reached, then price fell back near the open. The push up failed.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "candle-patterns",
      prompt: "Several candles in a row have long lower wicks ending at about the same price. What is that?",
      choices: [
        "Random noise",
        "Buyers repeatedly defending a level",
        "A guaranteed breakout coming",
        "Sellers in control",
      ],
      answer: 1,
      explain: "Each wick is a failed attempt to go lower. Repeated at one price, that's a level the market respects.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "candle-anatomy",
      prompt: "A candle opened at 100, hit 104, dropped to 99, and closed at 103. What is its body?",
      choices: ["99 to 104", "100 to 103", "103 to 104", "99 to 100"],
      answer: 1,
      explain: "The body is open to close: 100 to 103. The wicks reach 104 above and 99 below.",
    },
  ],
};

const l2_3: Lesson = {
  id: "s2-checkpoint",
  title: "Checkpoint: Candles",
  checkpoint: true,
  exercises: [
    {
      id: "c1",
      type: "tap-candle",
      tag: "candle-anatomy",
      prompt: "Tap the part of this candle that shows the open-to-close range.",
      bullish: false,
      answer: "body",
      explain: "Open to close is the body.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "candle-anatomy",
      prompt: "A red candle opened at 50 and closed at 48. Where is its high?",
      choices: ["Exactly 50", "Exactly 48", "At 50 or above", "At 48 or below"],
      answer: 2,
      explain: "The high can't be below the open. It is 50 if there's no upper wick, or above 50 if there is.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "candle-patterns",
      prompt: "Which candle shows sellers being overpowered within the period?",
      choices: [
        "Big red body, no wicks",
        "Tiny body, long lower wick",
        "Tiny body, long upper wick",
        "Big green body, no wicks",
      ],
      answer: 1,
      explain: "Sellers drove price down to the low, then buyers pushed it all the way back. That's the long lower wick.",
    },
    {
      id: "c2",
      type: "tap-candle",
      tag: "candle-anatomy",
      prompt: "Tap the wick that shows a failed push to the downside.",
      bullish: true,
      answer: "lower-wick",
      explain: "A lower wick is a push down that didn't hold.",
    },
  ],
};

// ---------- Stage 3: Market structure ----------

const l3_1: Lesson = {
  id: "s3-trends",
  title: "Trends: higher highs, lower lows",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "trend",
      title: "The market thinks in trends",
      body: [
        "A bull trend is a series of higher highs and higher lows. Each push up goes further than the last, and each pullback stops above the last one.",
        "A bear trend is the mirror: lower highs and lower lows.",
        "If you have neither, or both, be careful. No assumptions. If you can't name the trend, you don't have one.",
      ],
      chart: { seed: 101, structure: "bull", bars: 50 },
    },
    {
      id: "cl1",
      type: "classify",
      tag: "trend",
      prompt: "What is this chart doing?",
      chart: { seed: 202, structure: "bear", bars: 50 },
      explain: "Each high is lower than the one before, and each low is lower too. Bear trend.",
    },
    {
      id: "cl2",
      type: "classify",
      tag: "trend",
      prompt: "What is this chart doing?",
      chart: { seed: 303, structure: "bull", bars: 50 },
      explain: "Higher highs and higher lows all the way across. Bull trend.",
    },
    {
      id: "cl3",
      type: "classify",
      tag: "trend",
      prompt: "What is this chart doing?",
      chart: { seed: 404, structure: "range", bars: 50 },
      explain: "The highs stay roughly level and so do the lows. No trend. Be careful here.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "trend",
      prompt: "A chart is in a clear bull trend. Which trade should you never take?",
      choices: ["A long (betting it goes up)", "A short (betting it goes down)", "No trade at all"],
      answer: 1,
      explain: "Know the direction of the trend and never trade against it.",
    },
  ],
};

const l3_2: Lesson = {
  id: "s3-swings",
  title: "Finding the swings",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "trend",
      title: "Swing highs and swing lows",
      body: [
        "A swing high is a peak: a candle whose high is above its neighbours on both sides. A swing low is a trough.",
        "Trends are just a chain of swings. Spot the swings and the trend names itself.",
        "On the chart below, the swing lows are marked. Notice each one sits above the last: higher lows.",
      ],
      chart: { seed: 505, structure: "bull", bars: 50 },
    },
    {
      id: "s1",
      type: "tap-swings",
      tag: "trend",
      prompt: "Tap every swing low on this chart.",
      chart: { seed: 606, structure: "bull", bars: 45 },
      target: "lows",
      explain: "Each pullback bottoms above the previous one. Those troughs are the swing lows.",
    },
    {
      id: "s2",
      type: "tap-swings",
      tag: "trend",
      prompt: "Tap every swing high on this chart.",
      chart: { seed: 707, structure: "bear", bars: 45 },
      target: "highs",
      explain: "In a bear trend the bounces top out lower each time. Those peaks are the swing highs.",
    },
    {
      id: "s3",
      type: "tap-swings",
      tag: "trend",
      prompt: "Tap every swing low on this chart.",
      chart: { seed: 808, structure: "range", bars: 45 },
      target: "lows",
      explain: "In a range the swing lows keep landing near the same price. That's the bottom of the range.",
    },
  ],
};

const l3_3: Lesson = {
  id: "s3-levels",
  title: "Support, resistance and the retest",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "support-resistance",
      title: "Levels the market remembers",
      body: [
        "Support is a price where buyers keep stepping in: price bounces off it again and again. Resistance is the mirror, where sellers keep stepping in.",
        "When price finally breaks through a level, it often comes back fairly quickly to retest it from the other side. Old resistance becomes new support, and vice versa.",
        "That retest is one of the highest-probability places to enter a trade with the trend.",
      ],
      chart: { seed: 909, structure: "range", bars: 50 },
      levels: [
        { label: "Resistance", price: 106, color: "#ef4444" },
        { label: "Support", price: 94, color: "#22c55e" },
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "support-resistance",
      prompt: "Price has bounced up off $94 four times. What is $94?",
      choices: ["Resistance", "Support", "A trendline", "The open"],
      answer: 1,
      explain: "A level price keeps bouncing up from is support. Buyers defend it.",
      chart: { seed: 909, structure: "range", bars: 50 },
      levels: [{ label: "?", price: 94, color: "#eab308" }],
    },
    {
      id: "q2",
      type: "choice",
      tag: "retest",
      prompt: "Price breaks above a resistance level at $106. What often happens next?",
      choices: [
        "It never returns to $106",
        "It comes back to retest $106, now as support",
        "It immediately reverses into a bear trend",
        "Nothing can be said",
      ],
      answer: 1,
      explain: "Broken levels flip roles. The retest of old resistance as new support is a classic entry.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "rejection",
      prompt: "What's the difference between support/resistance and a rejection?",
      choices: [
        "They're the same thing",
        "Support/resistance is a level price bounces off repeatedly; a rejection is a move that fully returns to where it started",
        "A rejection only happens on a 1-minute chart",
        "Support only exists in bull trends",
      ],
      answer: 1,
      explain: "A level holds repeatedly. A rejection is one round trip: price leaves a point and comes all the way back to it.",
    },
  ],
};

const l3_4: Lesson = {
  id: "s3-trendlines",
  title: "Drawing trendlines",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "trendlines",
      title: "Which points to connect",
      body: [
        "In an uptrend, connect the swing lows. In a downtrend, connect the swing highs.",
        "Connecting the lows in a downtrend, or the highs in an uptrend, is not reliable enough to trade from.",
        "The line is only as good as the points behind it: two touches is a guess, three or more is a trendline.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "trendlines",
      prompt: "You're drawing a trendline on a bull trend. Which points do you connect?",
      choices: ["The swing highs", "The swing lows", "The closes", "The volume bars"],
      answer: 1,
      explain: "Uptrend: connect the lows. They show where buyers keep stepping back in.",
    },
    {
      id: "s1",
      type: "tap-swings",
      tag: "trendlines",
      prompt: "This is a bear trend. Tap the points you'd connect for a trendline.",
      chart: { seed: 1010, structure: "bear", bars: 45 },
      target: "highs",
      explain: "Downtrend: connect the swing highs.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "trendlines",
      prompt: "A trendline that price has touched twice is:",
      choices: ["Confirmed and tradeable", "A guess until a third touch", "Always resistance", "Useless"],
      answer: 1,
      explain: "Two points define any line. The third touch is what shows the market respects it.",
    },
  ],
};

const l3_5: Lesson = {
  id: "s3-checkpoint",
  title: "Checkpoint: Market structure",
  checkpoint: true,
  exercises: [
    {
      id: "cl1",
      type: "classify",
      tag: "trend",
      prompt: "Name the structure.",
      chart: { seed: 1111, structure: "bull", bars: 50 },
      explain: "Higher highs and higher lows: bull.",
    },
    {
      id: "s1",
      type: "tap-swings",
      tag: "trend",
      prompt: "Tap every swing low.",
      chart: { seed: 1212, structure: "bull", bars: 45 },
      target: "lows",
      explain: "Each trough above the last one.",
    },
    {
      id: "cl2",
      type: "classify",
      tag: "trend",
      prompt: "Name the structure.",
      chart: { seed: 1313, structure: "range", bars: 50 },
      explain: "Level highs, level lows: a range. Be careful.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "trend",
      prompt: "The 4-hour chart is in a bull trend but the 1-hour chart is in a bear trend. You should:",
      choices: [
        "Trade the 1-hour short with big targets",
        "Be more careful and take safer, closer targets",
        "Ignore the 4-hour entirely",
        "Flip a coin",
      ],
      answer: 1,
      explain: "When timeframes disagree, be careful and take safer targets. When they agree, targets can be further.",
    },
    {
      id: "s2",
      type: "tap-swings",
      tag: "trendlines",
      prompt: "Bear trend. Tap the points you'd connect for a trendline.",
      chart: { seed: 1414, structure: "bear", bars: 45 },
      target: "highs",
      explain: "Downtrend: connect the highs.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "retest",
      prompt: "After a breakout above resistance, the best-odds entry is usually:",
      choices: ["Chasing the breakout candle", "The retest of the broken level", "Waiting for a new all-time high", "Shorting the breakout"],
      answer: 1,
      explain: "Let it come back. The retest gives you a defined level to trade from.",
    },
  ],
};

// ---------- Stage 4: Trade planning ----------

const l4_1: Lesson = {
  id: "s4-targets",
  title: "Targets and locking in profit",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "targets",
      title: "Know where you're getting out before you get in",
      body: [
        "Going long? Your first target is the most obvious level of resistance above you. Going short? The most obvious support below.",
        "Set the target a little short of the level so you actually get filled. A target the market never quite reaches is worth nothing.",
        "If price fails to reach that level, the trend you're trading against is stronger than it looked. Respect that.",
        "Always lock in your profits. A winner that turns into a loser is a discipline problem, not bad luck.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "targets",
      prompt: "You're going long. Where is your first target?",
      choices: [
        "The most obvious resistance above",
        "The most obvious support below",
        "Double your entry",
        "Wherever feels right",
      ],
      answer: 0,
      explain: "Long: target the obvious resistance. Short: target the obvious support.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "targets",
      prompt: "Resistance is at $106.00. Where should your sell target sit?",
      choices: ["Exactly $106.00", "A little below, like $105.80", "Above, like $106.50", "It doesn't matter"],
      answer: 1,
      explain: "A few ticks before the level makes sure you get filled instead of watching price turn 5 cents short.",
      chart: { seed: 909, structure: "range", bars: 50 },
      levels: [{ label: "Resistance", price: 106, color: "#ef4444" }],
    },
    {
      id: "q3",
      type: "choice",
      tag: "targets",
      prompt: "Your long trade rallies but stalls well short of the resistance target, then starts dropping. What does that tell you?",
      choices: [
        "Nothing, keep holding for the target",
        "The opposing trend is stronger than it looked",
        "Add more to the position",
        "Resistance moved",
      ],
      answer: 1,
      explain: "Failure to reach the obvious level is information. Lock in what you have.",
    },
  ],
};

const l4_2: Lesson = {
  id: "s4-process",
  title: "Consistency and the no-rush rule",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "process",
      title: "Consistency comes before everything",
      body: [
        "Don't try to pick tops and bottoms. Take high-probability trades only: continuations with the trend, and price voids where the market has room to move.",
        "Never trade in a rush. If you can't go through your checklist, you don't have a trade.",
        "Check the news calendar before you enter, and be out at least an hour before a major event. A perfect chart means nothing against a scheduled announcement.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "process",
      prompt: "A big economic announcement is in 40 minutes. You see a setup you like. What do you do?",
      choices: ["Take it, it's a good setup", "Skip it; you should be flat at least an hour before major news", "Take it with double size"],
      answer: 1,
      explain: "News overrides the chart. Be out at least an hour before.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "process",
      prompt: "Which of these is a high-probability trade?",
      choices: [
        "Shorting the top of a strong bull trend because 'it has to turn'",
        "A continuation entry with the trend after a retest",
        "Buying because a friend said so",
        "Any trade right after a big news release",
      ],
      answer: 1,
      explain: "Continuations with the trend. Picking tops and bottoms is how win rates die.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "risk",
      prompt: "You skipped a setup because it broke a rule, and it would have won. What was that decision?",
      choices: ["A mistake", "A good decision with a lucky-for-them outcome", "Proof the rules are wrong"],
      answer: 1,
      explain: "Judge decisions by process, not by one result. Consistency comes before everything.",
    },
    {
      id: "q4",
      type: "choice",
      tag: "process",
      prompt: "You feel rushed and haven't finished checking your rules. The entry is right now or never. You:",
      choices: ["Enter now", "Let it go", "Enter with half size"],
      answer: 1,
      explain: "Never trade in a rush. There's always another trade.",
    },
  ],
};

export const STAGES: Stage[] = [
  {
    id: "stage-1",
    number: 1,
    title: "Reading charts",
    blurb: "Axes, timeframes, and knowing what scale you're on.",
    units: [{ id: "u1", title: "The basics", lessons: [l1_1, l1_2, l1_3] }],
  },
  {
    id: "stage-2",
    number: 2,
    title: "Candles",
    blurb: "Open, high, low, close, and what wicks tell you.",
    units: [{ id: "u2", title: "Candlesticks", lessons: [l2_1, l2_2, l2_3] }],
  },
  {
    id: "stage-3",
    number: 3,
    title: "Market structure",
    blurb: "Trends, swings, support and resistance, retests, trendlines.",
    units: [{ id: "u3", title: "Structure", lessons: [l3_1, l3_2, l3_3, l3_4, l3_5] }],
  },
  {
    id: "stage-4",
    number: 4,
    title: "Trade planning",
    blurb: "Targets, locking in profit, news, and the no-rush rule.",
    units: [{ id: "u4", title: "The plan", lessons: [l4_1, l4_2] }],
  },
  {
    id: "stage-5",
    number: 5,
    title: "Options mechanics",
    blurb: "Calls, puts, strikes, expiries, and the greeks.",
    units: [],
    premium: true,
  },
  {
    id: "stage-6",
    number: 6,
    title: "Swing options",
    blurb: "Picking expiry and delta, sizing, managing the trade.",
    units: [],
    premium: true,
  },
  {
    id: "stage-7",
    number: 7,
    title: "0DTE",
    blurb: "Gamma, theta, time of day, and hard loss limits.",
    units: [],
    premium: true,
  },
];

export const ALL_LESSONS: Lesson[] = STAGES.flatMap((s) => s.units.flatMap((u) => u.lessons));

export function findLesson(id: string) {
  return ALL_LESSONS.find((l) => l.id === id);
}

/** A lesson is unlocked when every lesson before it (across stages) is passed. */
export function isLessonUnlocked(id: string, passed: Record<string, { passed: boolean }>) {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  if (idx <= 0) return true;
  return ALL_LESSONS.slice(0, idx).every((l) => passed[l.id]?.passed);
}
