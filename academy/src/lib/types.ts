// Core content model. Lessons are data, not code: a lesson is an ordered
// list of exercises, and each exercise is one of a small set of types the
// player knows how to render and grade.

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Structure = "bull" | "bear" | "range";

export type ChartSpec = {
  seed: number;
  structure: Structure;
  bars?: number;
};

/** A labelled horizontal level drawn on the chart. */
export type Level = { label: string; price: number; color?: string };

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
  | "process";

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

export type Exercise =
  | TeachExercise
  | ChoiceExercise
  | ClassifyExercise
  | TapSwingsExercise
  | TapCandleExercise;

export type Lesson = {
  id: string;
  title: string;
  /** A checkpoint lesson gates the next stage and needs a higher score. */
  checkpoint?: boolean;
  exercises: Exercise[];
};

export type Unit = { id: string; title: string; lessons: Lesson[] };

export type Stage = {
  id: string;
  number: number;
  title: string;
  blurb: string;
  /** Stages without units are placeholders on the path. */
  units: Unit[];
  premium?: boolean;
};
