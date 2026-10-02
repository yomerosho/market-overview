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


const l4_3: Lesson = {
  id: "s4-replay",
  title: "Chart replay: make the call",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "process",
      title: "Decide at the right edge",
      body: [
        "This is the drill that matters. You'll see a chart up to the right edge, where a real trader has to decide with nothing to the right of it.",
        "Name the structure. Bull trend: look for a long. Bear trend: look for a short. No clear trend: skip. Skipping is a trade decision too, and it earns the same XP.",
        "Then watch what happens. Judge yourself on the decision, not on the outcome.",
      ],
    },
    {
      id: "r1",
      type: "replay",
      tag: "trend",
      prompt: "Long, short, or skip?",
      chart: { seed: 2001, structure: "bull", bars: 60 },
      reveal: 40,
      explain: "Higher highs and higher lows into the right edge. With the trend means long.",
    },
    {
      id: "r2",
      type: "replay",
      tag: "trend",
      prompt: "Long, short, or skip?",
      chart: { seed: 2002, structure: "range", bars: 60 },
      reveal: 40,
      explain: "No trend. You don't trade what you can't name. Skipping was the right call.",
    },
    {
      id: "r3",
      type: "replay",
      tag: "trend",
      prompt: "Long, short, or skip?",
      chart: { seed: 2003, structure: "bear", bars: 60 },
      reveal: 40,
      explain: "Lower highs, lower lows. Short with the trend.",
    },
    {
      id: "r4",
      type: "replay",
      tag: "process",
      prompt: "Long, short, or skip?",
      chart: { seed: 2004, structure: "bull", bars: 60 },
      reveal: 40,
      explain: "Bull trend. Never trade against it, and never skip a clean continuation out of fear.",
    },
  ],
};

// ---------- Stage 5: Options mechanics ----------

const l5_1: Lesson = {
  id: "s5-calls-puts",
  title: "Calls and puts",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "options-basics",
      title: "A contract, not a share",
      body: [
        "An option is a contract. A call gives you the right to buy 100 shares at a set price (the strike) before a set date (the expiry). A put gives you the right to sell.",
        "You pay a premium for that right. If you're wrong, the most you can lose as a buyer is the premium. That's the whole appeal, and the whole trap: the premium goes to zero if nothing happens.",
        "Bullish on a chart? Buy a call. Bearish? Buy a put. The chart reading you've already learned decides which.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "options-basics",
      prompt: "You read a clean bull trend and want to trade it with an option. You buy:",
      choices: ["A call", "A put", "Both", "Neither, options are only for bear trends"],
      answer: 0,
      explain: "A call makes money when the stock goes up.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "options-basics",
      prompt: "You buy a call for $2.00 per share. The stock drops hard and never recovers. What's your maximum loss?",
      choices: ["Unlimited", "$2.00 per share ($200 per contract)", "The stock price", "Nothing"],
      answer: 1,
      explain: "A buyer can only lose the premium. One contract is 100 shares, so $2.00 x 100 = $200.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "options-basics",
      prompt: "A put gives you the right to:",
      choices: ["Buy shares at the strike", "Sell shares at the strike", "Receive dividends", "Vote at shareholder meetings"],
      answer: 1,
      explain: "Put = right to sell. It gains value when the stock falls.",
    },
  ],
};

const l5_2: Lesson = {
  id: "s5-strikes",
  title: "Strikes and expiry",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "strikes-expiry",
      title: "In the money, out of the money",
      body: [
        "A call is in the money (ITM) when the stock is above the strike: it already has real value. Out of the money (OTM) means the stock is below the strike: all of the premium is hope.",
        "For a put it's reversed: ITM when the stock is below the strike.",
        "Further OTM is cheaper and pays off bigger if you're right, but it's wrong far more often. Closer to the money costs more and behaves more like stock.",
        "In the lab below, drag the strike and watch the premium and the P&L curve change.",
      ],
    },
    {
      id: "lab1",
      type: "options-lab",
      tag: "strikes-expiry",
      prompt: "Set up an out-of-the-money call.",
      side: "call",
      goal: { metric: "moneyness", value: "otm" },
      explain: "The stock is at $100, so any call with a strike above $100 is OTM.",
    },
    {
      id: "lab2",
      type: "options-lab",
      tag: "strikes-expiry",
      prompt: "Set up an in-the-money put.",
      side: "put",
      goal: { metric: "moneyness", value: "itm" },
      explain: "A put is ITM when the stock is below the strike, so the strike must be above $100.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "strikes-expiry",
      prompt: "The stock is at $100. Which call is cheapest?",
      choices: ["$90 strike", "$100 strike", "$110 strike"],
      answer: 2,
      explain: "The $110 call is furthest OTM. The stock has to climb 10% before it's worth anything at expiry.",
    },
  ],
};

const l5_3: Lesson = {
  id: "s5-theta",
  title: "Time decay",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "greeks",
      title: "Theta: the price of waiting",
      body: [
        "Every day that passes, an option loses a little value even if the stock doesn't move. That daily loss is theta.",
        "Theta isn't steady. It's small with 60 days left and brutal in the last few days. A 0DTE option is almost pure theta: it melts by the hour.",
        "That's why swing trades use expiries weeks out, and why 0DTE is the last stage of this course, not the first.",
      ],
    },
    {
      id: "lab1",
      type: "options-lab",
      tag: "greeks",
      prompt: "Drag days-to-expiry down and watch theta. Then set up a call with 7 days or less left.",
      side: "call",
      goal: { metric: "dte", max: 7 },
      explain: "Notice how theta per day grows as expiry gets close. That's the cost of holding short-dated options.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "greeks",
      prompt: "You buy a call with 3 days to expiry. The stock goes nowhere for 3 days. Your option:",
      choices: ["Keeps its value", "Loses most or all of its value", "Gains value", "Converts to shares"],
      answer: 1,
      explain: "No move plus fast theta means the premium melts. Short-dated options need the move to happen now.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "greeks",
      prompt: "Which expiry loses value fastest per day from time alone?",
      choices: ["90 days out", "30 days out", "2 days out"],
      answer: 2,
      explain: "Theta accelerates into expiry.",
    },
  ],
};

const l5_4: Lesson = {
  id: "s5-delta",
  title: "Delta",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "greeks",
      title: "Delta: how much the option moves",
      body: [
        "Delta tells you how much the option's price changes when the stock moves $1. A 0.50-delta call gains about $0.50 when the stock rises $1.",
        "It's also a rough probability of finishing in the money. A 0.20-delta option is a long shot. A 0.70-delta option behaves a lot like owning the stock.",
        "Many swing traders live around 0.40 to 0.60 delta: enough move to matter, not so far OTM that it needs a miracle.",
      ],
    },
    {
      id: "lab1",
      type: "options-lab",
      tag: "greeks",
      prompt: "Set up a call with a delta between 0.40 and 0.60.",
      side: "call",
      goal: { metric: "delta", min: 0.4, max: 0.6 },
      explain: "Near-the-money calls sit around 0.50 delta. Move the strike away from $100 and watch delta fall.",
    },
    {
      id: "lab2",
      type: "options-lab",
      tag: "greeks",
      prompt: "Set up a cheap, low-probability put: delta no bigger than 0.20.",
      side: "put",
      goal: { metric: "delta", min: 0, max: 0.2 },
      explain: "Far OTM puts have small delta. Cheap, but they need a big drop to pay.",
    },
    {
      id: "q1",
      type: "choice",
      tag: "greeks",
      prompt: "A 0.30-delta call costs $1.00. The stock rises $1. Roughly what is the call worth now?",
      choices: ["$1.00", "$1.30", "$2.00", "$0.70"],
      answer: 1,
      explain: "Delta 0.30 means about $0.30 of gain per $1 of stock move.",
    },
  ],
};

const l5_5: Lesson = {
  id: "s5-checkpoint",
  title: "Checkpoint: Options mechanics",
  checkpoint: true,
  exercises: [
    {
      id: "q1",
      type: "choice",
      tag: "options-basics",
      prompt: "You read a bear trend on the daily chart. The option trade that matches is:",
      choices: ["Buy a call", "Buy a put", "Skip, options can't trade down moves"],
      answer: 1,
      explain: "Bearish read, buy a put.",
    },
    {
      id: "lab1",
      type: "options-lab",
      tag: "strikes-expiry",
      prompt: "Set up a swing-style call: delta between 0.40 and 0.60, with at least a few weeks on it.",
      side: "call",
      goal: { metric: "delta", min: 0.4, max: 0.6 },
      explain: "Near the money, weeks out. That's the swing shape.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "greeks",
      prompt: "Why is 0DTE harder than swing trading?",
      choices: [
        "The premiums are bigger",
        "Theta is extreme, so you need the move to happen within hours",
        "You can't use charts",
        "It isn't, it's just faster",
      ],
      answer: 1,
      explain: "Time decay is the enemy. On a 0DTE, being right eventually is the same as being wrong.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "options-basics",
      prompt: "You paid $3.00 for a put. The stock rips higher. Your loss is at most:",
      choices: ["$300 per contract", "Unlimited", "$3 per contract", "The full stock price"],
      answer: 0,
      explain: "Premium x 100 shares. That's the cap for an option buyer.",
    },
    {
      id: "lab2",
      type: "options-lab",
      tag: "strikes-expiry",
      prompt: "Make this call cost $1.00 or less per share.",
      side: "call",
      goal: { metric: "premium", max: 1 },
      explain: "Cheaper means further OTM, fewer days, or both. Cheap is not the same as good.",
    },
  ],
};

// ---------- Stage 7: 0DTE ----------
// The author's own intraday method: a fixed morning routine, a bias from
// the daily chart and moving averages, the day's key levels, and the
// 15-minute opening range as the trigger.

const l7_1: Lesson = {
  id: "s7-routine",
  title: "The morning routine",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "routine",
      title: "Before the open, every day, in this order",
      body: [
        "1. On the daily chart, draw today's support and resistance lines and any trendlines. These are the walls price has to deal with today.",
        "2. Check where price sits relative to the 9, 21 and 50 moving averages, and the bigger 100 and 200. That, plus the daily structure, gives you a bias: bullish or bearish.",
        "3. Check full timeframe continuity (FTFC): are the weekly, daily, 4-hour, 1-hour and 15-minute all pointing the same way? When all five agree, you can trust the bias more and take further targets. When they don't, be more careful.",
        "4. Draw the premarket high (PMH) and premarket low (PML).",
        "5. At the open, mark yesterday's high and low (PDH, PDL). Now you have your map.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "routine",
      prompt: "Which chart do you draw today's support and resistance from?",
      choices: ["The 1-minute", "The 5-minute", "The daily", "Whatever's open"],
      answer: 2,
      explain: "The daily chart. Big levels come from big timeframes; the intraday chart just shows you how price reacts to them.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "routine",
      prompt: "The weekly, daily, 4-hour, 1-hour and 15-minute charts are all making higher highs and higher lows. That is:",
      choices: ["A range", "Full timeframe continuity to the upside", "A reason to short", "Irrelevant for 0DTE"],
      answer: 1,
      explain: "All five timeframes agree: FTFC bullish. Trust longs more and allow further targets.",
    },
    {
      id: "q2b",
      type: "choice",
      tag: "routine",
      prompt: "Which timeframes make up full timeframe continuity?",
      choices: [
        "Daily and 4-hour",
        "Weekly, daily, 4-hour, 1-hour and 15-minute",
        "1-minute and 5-minute",
        "Monthly and weekly only",
      ],
      answer: 1,
      explain: "1W, 1D, 4H, 1H and 15m. All five pointing the same way is full continuity.",
    },
    {
      id: "q2c",
      type: "choice",
      tag: "routine",
      prompt: "The weekly, daily and 4-hour are bullish but the 1-hour and 15-minute are making lower lows. What do you have?",
      choices: ["Full timeframe continuity", "Partial continuity; be more careful and take safer targets", "A bearish bias"],
      answer: 1,
      explain: "The big timeframes still lean long, but the small ones disagree. No FTFC, so safer targets and more patience.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "routine",
      prompt: "You wake up late and the market opens in 2 minutes. You haven't drawn any levels. What do you do?",
      choices: ["Trade the first candle, it's the best one", "Do the routine first; if you miss the open, you miss it", "Guess the levels from memory"],
      answer: 1,
      explain: "Never trade in a rush. No map, no trade. There's a 1pm window too.",
    },
  ],
};

const l7_2: Lesson = {
  id: "s7-bias",
  title: "Bias from the moving averages",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "bias",
      title: "Where is price relative to the averages?",
      body: [
        "The 9 and 21 MAs track the short-term trend. The 50 tracks the swing. The 100 and 200 are the big picture.",
        "Price above the 9, the 9 above the 21, the 21 above the 50: stacked bullish. Lean long today. The mirror is stacked bearish: lean short.",
        "Price tangled up in the averages with no clear order: no bias. That's a 'be careful' day; the ORB had better be very clean before you touch it.",
      ],
      chart: { seed: 7101, structure: "bull", bars: 120, mas: [9, 21, 50] },
    },
    {
      id: "q1",
      type: "choice",
      tag: "bias",
      prompt: "What's the bias on this chart?",
      choices: ["Bullish", "Bearish", "No bias"],
      answer: 0,
      explain: "Price is above all three averages and they're stacked 9 over 21 over 50. Lean long.",
      chart: { seed: 7101, structure: "bull", bars: 120, mas: [9, 21, 50] },
    },
    {
      id: "q2",
      type: "choice",
      tag: "bias",
      prompt: "What's the bias on this chart?",
      choices: ["Bullish", "Bearish", "No bias"],
      answer: 1,
      explain: "Price under the averages, averages stacked downward. Lean short.",
      chart: { seed: 7102, structure: "bear", bars: 120, mas: [9, 21, 50] },
    },
    {
      id: "q3",
      type: "choice",
      tag: "bias",
      prompt: "What's the bias on this chart?",
      choices: ["Bullish", "Bearish", "No bias"],
      answer: 2,
      explain: "Price is crossing back and forth through the averages. No bias today; be careful.",
      chart: { seed: 7103, structure: "range", bars: 120, mas: [9, 21, 50] },
    },
    {
      id: "q4",
      type: "choice",
      tag: "bias",
      prompt: "Your bias is bearish but the first candle rips higher through the premarket high. You:",
      choices: ["Short it, the bias says so", "Don't fight it; either take the long with a tight target or wait", "Double your short"],
      answer: 1,
      explain: "Bias is a lean, not a law. Never trade against what price is actually doing.",
    },
  ],
};

const l7_3: Lesson = {
  id: "s7-levels",
  title: "The levels of the day",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "key-levels",
      title: "PMH, PML, PDH, PDL and the ORB",
      body: [
        "Premarket high and low (PMH / PML, orange): what the early session already tested. A 5-minute close through one of these is your first sign of real direction.",
        "Yesterday's high and low (PDH / PDL, purple): the obvious targets. A quick trade off the open runs to the nearest one, or to the nearest daily support/resistance if that's closer.",
        "The 15-minute opening range (ORB, blue): the high and low of the first three 5-minute candles. The break out of it, and how price behaves right after, is the trigger.",
      ],
      chart: { seed: 7301, structure: "bull", scenario: "continuation-up" },
    },
    {
      id: "q1",
      type: "choice",
      tag: "key-levels",
      prompt: "The 15-minute opening range is:",
      choices: [
        "The high and low of the first 5-minute candle",
        "The high and low of the first three 5-minute candles",
        "Yesterday's range",
        "The premarket range",
      ],
      answer: 1,
      explain: "9:30, 9:35, 9:40. Their combined high and low is the ORB.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "key-levels",
      prompt: "You go long off the open. Where's your first target?",
      choices: [
        "The nearest of PDH or a daily resistance above",
        "Always PDH, no matter how far",
        "Double the ORB height",
        "Wherever it's at 10:30",
      ],
      answer: 0,
      explain: "Nearest obvious level first. Long: resistance above. Short: support below. Lock in profit there.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "key-levels",
      prompt: "Price breaks above the ORB high but the 5-minute candle closes back below the PMH. Is that continuation?",
      choices: ["Yes, it broke the ORB", "Not yet; you need a 5-minute close beyond the PMH/PML", "Only if it's after 10:30"],
      answer: 1,
      explain: "The ORB break is the setup; the close through the premarket level is the confirmation.",
    },
  ],
};

const l7_4: Lesson = {
  id: "s7-first-candle",
  title: "The first five minutes",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "orb",
      title: "When the first candle already decides",
      body: [
        "Sometimes the first 5-minute candle opens and closes straight through the PMH or PML. That's an open drive: no waiting for the ORB.",
        "You can take a quick trade in that direction, target the nearest support/resistance or PDH/PDL, and be out fast. Volume is highest in the first half hour, so the move is most reliable then.",
        "If the first candle is still inside the premarket range, do nothing yet. Let the 15-minute range form.",
      ],
    },
    {
      id: "r1",
      type: "replay",
      tag: "orb",
      prompt: "First candle just closed. Long, short, or wait?",
      chart: { seed: 7401, structure: "bull", scenario: "open-drive-up" },
      explain: "A 5-minute close above the PMH on heavy opening volume. Quick long to PDH.",
    },
    {
      id: "r2",
      type: "replay",
      tag: "orb",
      prompt: "First candle just closed. Long, short, or wait?",
      chart: { seed: 7402, structure: "bear", scenario: "open-drive-down" },
      explain: "Closed through the PML on volume. Quick short to PDL.",
    },
    {
      id: "r3",
      type: "replay",
      tag: "orb",
      prompt: "First 5-minute close after the ORB. Long, short, or wait?",
      chart: { seed: 7403, structure: "range", scenario: "chop" },
      explain: "Still inside the range, nothing confirmed. Skipping was right.",
    },
  ],
};

const l7_5: Lesson = {
  id: "s7-orb",
  title: "Trading the 15-minute ORB",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "orb",
      title: "Real break or fake break?",
      body: [
        "The ideal trade: price breaks out of the 15-minute ORB and the next 5-minute candle closes beyond the PMH (or PML), on strong volume, early in the session. That's continuation. Take it toward the nearest target.",
        "The trap: price pokes out of the ORB on thin volume and the candle closes back inside. A failed breakout likely reverses. Don't chase the poke.",
        "Watch the volume bars under the chart. A break without volume is a question, not an answer.",
      ],
      chart: { seed: 7501, structure: "range", scenario: "failed-up" },
    },
    {
      id: "r1",
      type: "replay",
      tag: "orb",
      prompt: "ORB formed, one 5-minute candle closed after it. Long, short, or skip?",
      chart: { seed: 7502, structure: "bull", scenario: "continuation-up" },
      explain: "Broke the ORB high and closed above PMH on volume. Continuation long toward PDH.",
    },
    {
      id: "r2",
      type: "replay",
      tag: "orb",
      prompt: "ORB formed, one 5-minute candle closed after it. Long, short, or skip?",
      chart: { seed: 7503, structure: "range", scenario: "failed-up" },
      explain: "The wick went above the ORB but the candle closed back inside on weak volume. Failed break; it reversed. Skip.",
    },
    {
      id: "r3",
      type: "replay",
      tag: "orb",
      prompt: "ORB formed, one 5-minute candle closed after it. Long, short, or skip?",
      chart: { seed: 7504, structure: "bear", scenario: "continuation-down" },
      explain: "Broke the ORB low and closed below PML with volume. Short toward PDL.",
    },
    {
      id: "r4",
      type: "replay",
      tag: "orb",
      prompt: "ORB formed, one 5-minute candle closed after it. Long, short, or skip?",
      chart: { seed: 7505, structure: "range", scenario: "failed-down" },
      explain: "Poked under the ORB, closed back inside, no volume. That's a failed break. Skip.",
    },
    {
      id: "r5",
      type: "replay",
      tag: "orb",
      prompt: "ORB formed, one 5-minute candle closed after it. Long, short, or skip?",
      chart: { seed: 7506, structure: "range", scenario: "chop" },
      explain: "Never left the range. No trade.",
    },
  ],
};

const l7_6: Lesson = {
  id: "s7-clock",
  title: "The clock",
  exercises: [
    {
      id: "t1",
      type: "teach",
      tag: "clock",
      title: "When you trade matters as much as what",
      body: [
        "Morning window: the open to about 10:30 CST. Volume is highest, moves are cleanest. Aim to be done by 10:30.",
        "Midday is chop. Don't force it. If anything, look again from 1:00 to 2:00 CST.",
        "After 2:00 CST, a 0DTE option is mostly theta. If you trade the afternoon, use 1 or 2 DTE instead so the time decay doesn't eat a correct read.",
      ],
    },
    {
      id: "q1",
      type: "choice",
      tag: "clock",
      prompt: "It's 11:15 CST. You see something that looks like a setup. You:",
      choices: ["Take it, a setup is a setup", "Leave it; the morning window is closed and midday is chop", "Take it with 0DTE for extra leverage"],
      answer: 1,
      explain: "Be done by 10:30. The next look is 1:00 to 2:00.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "clock",
      prompt: "It's 2:30 CST and you want to trade a clean afternoon breakout. Which expiry?",
      choices: ["0DTE", "1 or 2 DTE", "30 DTE", "Doesn't matter"],
      answer: 1,
      explain: "After 2:00 a 0DTE is melting too fast. 1 or 2 DTE keeps the trade alive.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "clock",
      prompt: "Why is the open-drive trade most reliable in the first half hour?",
      choices: ["Theta is lowest then", "Volume is highest then, so moves follow through", "Market makers are asleep", "It isn't"],
      answer: 1,
      explain: "Early volume is what makes a break stick.",
    },
    {
      id: "q4",
      type: "choice",
      tag: "clock",
      prompt: "You took a long at 9:50 to PDH. It's 10:25 and price is 20 cents short of PDH and stalling. You:",
      choices: ["Hold for PDH, it's so close", "Lock in the profit", "Add to the position"],
      answer: 1,
      explain: "Target a little short of the level, lock in profits, be done by 10:30. Three rules say the same thing.",
    },
  ],
};

const l7_7: Lesson = {
  id: "s7-checkpoint",
  title: "Checkpoint: 0DTE",
  checkpoint: true,
  exercises: [
    {
      id: "q1",
      type: "choice",
      tag: "routine",
      prompt: "Put the morning in order: (A) draw PMH/PML, (B) daily S/R and trendlines, (C) MA bias and FTFC, (D) mark PDH/PDL at the open.",
      choices: ["A, B, C, D", "B, C, A, D", "D, A, B, C", "C, B, D, A"],
      answer: 1,
      explain: "Big levels first, then bias, then the premarket range, then yesterday's range at the open.",
    },
    {
      id: "q2",
      type: "choice",
      tag: "bias",
      prompt: "What's the bias?",
      choices: ["Bullish", "Bearish", "No bias"],
      answer: 1,
      explain: "Price under stacked-down averages.",
      chart: { seed: 7701, structure: "bear", bars: 120, mas: [9, 21, 50] },
    },
    {
      id: "r1",
      type: "replay",
      tag: "orb",
      prompt: "Long, short, or skip?",
      chart: { seed: 7702, structure: "bull", scenario: "continuation-up" },
      explain: "ORB break plus a 5-minute close above PMH on volume. Long.",
    },
    {
      id: "r2",
      type: "replay",
      tag: "orb",
      prompt: "Long, short, or skip?",
      chart: { seed: 7703, structure: "range", scenario: "failed-down" },
      explain: "Thin-volume poke, closed back in. Skip.",
    },
    {
      id: "r3",
      type: "replay",
      tag: "orb",
      prompt: "First candle just closed. Long, short, or wait?",
      chart: { seed: 7704, structure: "bear", scenario: "open-drive-down" },
      explain: "Closed through the PML on opening volume. Quick short.",
    },
    {
      id: "q3",
      type: "choice",
      tag: "clock",
      prompt: "It's 2:45 CST. The only acceptable option to trade is:",
      choices: ["0DTE", "1 or 2 DTE", "Weekly, 7 DTE", "None, the day is over"],
      answer: 1,
      explain: "After 2:00, 1 or 2 DTE only.",
    },
    {
      id: "r4",
      type: "replay",
      tag: "orb",
      prompt: "Long, short, or skip?",
      chart: { seed: 7705, structure: "bear", scenario: "continuation-down" },
      explain: "Break of the ORB low, close under PML with volume. Short to PDL.",
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
    units: [{ id: "u4", title: "The plan", lessons: [l4_1, l4_2, l4_3] }],
  },
  {
    id: "stage-5",
    number: 5,
    title: "Options mechanics",
    blurb: "Calls, puts, strikes, expiries, and the greeks.",
    units: [{ id: "u5", title: "Mechanics", lessons: [l5_1, l5_2, l5_3, l5_4, l5_5] }],
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
    blurb: "The morning routine, bias, key levels, the 15-minute ORB, and the clock.",
    units: [{ id: "u7", title: "The method", lessons: [l7_1, l7_2, l7_3, l7_4, l7_5, l7_6, l7_7] }],
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
