// Core content model. Lessons are data, not code: a lesson is an ordered
// list of exercises, and each exercise is one of a small set of types the
// player knows how to render and grade.

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Structure = "bull" | "bear" | "range";

/**
 * How an intraday session plays out after the open. Drives both the bars
 * and the "right answer" for the 0DTE drills.
 */
export type IntradayScenario =
  | "open-drive-up" // first 5-min candle closes above PMH, runs to PDH
  | "open-drive-down"
  | "continuation-up" // breaks the 15-min ORB, 5-min close above PMH, continues
  | "continuation-down"
  | "failed-up" // pokes above the ORB on weak volume, closes back in, reverses
  | "failed-down"
  | "reversal-short" // failed-up, then a 5-min bearish engulfing candle: short to the ORB low
  | "reversal-long" // failed-down, then a bullish engulfing candle: long to the ORB high
  | "chop"; // never leaves the ORB

export type SwingScenario =
  | "breakout-retest"
  | "ema-pullback"
  | "bull-flag"
  | "sma50-reclaim"
  | "failed-breakout"
  | "range";

export type ChartSpec = {
  seed: number;
  /** Daily chart with a given structure. Ignored when `scenario` is set. */
  structure: Structure;
  bars?: number;
  /** 5-minute session chart instead of a daily one. */
  scenario?: IntradayScenario;
  /** Draw PMH / PML / PDH / PDL / ORB on an intraday chart. */
  showLevels?: boolean;
  /** Overlay simple moving averages of these lengths on a daily chart. */
  mas?: number[];
  /** Overlay exponential moving averages of these lengths on a daily chart. */
  emas?: number[];
  /** A scripted daily swing setup instead of a plain structure. */
  swing?: SwingScenario;
};

/** A labelled horizontal level drawn on the chart. */
export type Level = { label: string; price: number; color?: string; style?: "solid" | "dashed" };

/** A translucent box over a range of bars, e.g. the opening range. */
export type Box = { from: number; to: number; top: number; bottom: number; color: string; label?: string };

export type Timeframe = "1W" | "1D" | "4H" | "1H" | "15m";

export type ConceptTag =
  | "axes"
  | "timeframes"
  | "candle-anatomy"
  | "candle-patterns"
  | "trend"
  | "support-resistance"
  | "rejection"
  | "trendlines"
  | "retest"
  | "targets"
  | "risk"
  | "news"
  | "process"
  | "options-basics"
  | "strikes-expiry"
  | "greeks"
  | "routine"
  | "bias"
  | "key-levels"
  | "orb"
  | "clock"
  | "regime"
  | "swing-setups"
  | "swing-entry"
  | "swing-options";

type Base = { id: string; tag: ConceptTag };

/** A teaching card. Not graded. */
export type TeachExercise = Base & {
  type: "teach";
  title: string;
  body: string[]; // paragraphs
  chart?: ChartSpec;
  levels?: Level[];
};

export type ChoiceExercise = Base & {
  type: "choice";
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
  chart?: ChartSpec;
  levels?: Level[];
};

/** Classify a generated chart as bull / bear / range. */
export type ClassifyExercise = Base & {
  type: "classify";
  prompt: string;
  chart: ChartSpec;
  explain: string;
};

/** Tap every swing high or every swing low on a generated chart. */
export type TapSwingsExercise = Base & {
  type: "tap-swings";
  prompt: string;
  chart: ChartSpec;
  target: "highs" | "lows";
  explain: string;
};

/** Tap a part of a single candle (body / wicks / open / close). */
export type TapCandleExercise = Base & {
  type: "tap-candle";
  prompt: string;
  bullish: boolean;
  answer: "body" | "upper-wick" | "lower-wick";
  explain: string;
};

/**
 * Chart replay: the student sees the first `reveal` bars, decides long /
 * short / skip, then watches the rest play out. The right call follows the
 * structure: bull → long, bear → short, range → skip.
 */
export type ReplayExercise = Base & {
  type: "replay";
  prompt: string;
  chart: ChartSpec;
  /** Bars shown before the decision. Intraday charts have a sensible default. */
  reveal?: number;
  explain: string;
};

export type LabGoal =
  | { metric: "delta"; min: number; max: number }
  | { metric: "moneyness"; value: "itm" | "otm" }
  | { metric: "dte"; max: number }
  | { metric: "premium"; max: number }
  /** The swing shape: 7–21 DTE, ATM or slightly ITM (|delta| 0.5–0.7). */
  | { metric: "swing" };

/** Interactive options pricer with a goal the student has to hit. */
export type OptionsLabExercise = Base & {
  type: "options-lab";
  prompt: string;
  side: "call" | "put";
  goal: LabGoal;
  explain: string;
};

/** An FTFC panel like the one on the author's chart: five timeframes, each up or down. */
export type FtfcExercise = Base & {
  type: "ftfc";
  prompt: string;
  frames: { tf: Timeframe; up: boolean }[];
  /** "bias": full bull / full bear / partial. "count": how many agree with the weekly. */
  ask: "bias" | "count";
  explain: string;
};

export type Exercise =
  | TeachExercise
  | FtfcExercise
  | ReplayExercise
  | OptionsLabExercise
  | ChoiceExercise
  | ClassifyExercise
  | TapSwingsExercise
  | TapCandleExercise;

export type Mastery = Partial<Record<ConceptTag, { correct: number; attempted: number }>>;

/** What a generated lesson gets to build its exercises from. */
export type BuildContext = { seed: number; mastery: Mastery };

export type Lesson = {
  id: string;
  title: string;
  /** Rough minutes, shown on the path. */
  minutes?: number;
  /** A checkpoint lesson gates the next stage and needs a higher score. */
  checkpoint?: boolean;
  /** Static, or built fresh each attempt (drills and reviews). */
  exercises: Exercise[] | ((ctx: BuildContext) => Exercise[]);
};

/** A unit is one day of the programme. */
export type Unit = { id: string; day: number; title: string; lessons: Lesson[] };

export type Stage = {
  id: string;
  number: number;
  title: string;
  blurb: string;
  /** Stages without units are placeholders on the path. */
  units: Unit[];
  premium?: boolean;
};
