// Drill factories. The same concept has to come back in several forms until
// it sticks, so instead of hand-writing every question, each concept has a
// pool of phrasings and a set of chart drills that take a seed. Generated
// lessons (practice and review) are assembled from these.

import type {
  ChoiceExercise,
  ClassifyExercise,
  ConceptTag,
  Exercise,
  FtfcExercise,
  IntradayScenario,
  Mastery,
  OptionsLabExercise,
  ReplayExercise,
  Structure,
  SwingScenario,
  TapCandleExercise,
  TapSwingsExercise,
  Timeframe,
} from "@/lib/types";

// ---------- tiny seeded RNG ----------

export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    shuffle: <T>(xs: readonly T[]) => {
      const a = xs.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

type R = ReturnType<typeof rng>;

// ---------- question pools ----------
// Each entry: prompt, choices, index of the right one, explanation.
type Q = { prompt: string; choices: string[]; answer: number; explain: string };

const POOLS: Partial<Record<ConceptTag, Q[]>> = {
  axes: [
    { prompt: "On a price chart, where is the most recent price?", choices: ["Far left", "Far right", "At the top", "In the middle"], answer: 1, explain: "Time runs left to right, so the newest bar is always on the right edge." },
    { prompt: "What does the vertical (right-hand) axis show?", choices: ["Time", "Volume", "Price", "Number of trades"], answer: 2, explain: "Up means a higher price, down means lower." },
    { prompt: "Where does tomorrow's candle appear?", choices: ["Left of the first candle", "Right of the last candle", "Above the highest candle"], answer: 1, explain: "New time is always added on the right." },
    { prompt: "Everything to the left of the last candle is:", choices: ["The future", "What already happened", "A prediction", "Noise"], answer: 1, explain: "The left is history. Your job is to read it to decide at the right edge." },
    { prompt: "A chart's bottom axis shows:", choices: ["Price", "Time", "Volume", "Delta"], answer: 1, explain: "Time along the bottom, price up the side." },
  ],
  timeframes: [
    { prompt: "On a 4-hour chart, how much trading does one candle represent?", choices: ["4 minutes", "4 hours", "4 days", "4 trades"], answer: 1, explain: "The timeframe names how long each candle lasts." },
    { prompt: "You're on your phone and the 15-minute chart only fits an hour of history. What should you do?", choices: ["Trade anyway", "Zoom in further", "Switch to a larger timeframe to see more history", "Guess from the last candle"], answer: 2, explain: "Not enough history means no decision. A larger timeframe fits more of the story on screen." },
    { prompt: "Which timeframe shows the bigger picture?", choices: ["1-minute", "15-minute", "1-hour", "Daily"], answer: 3, explain: "Larger timeframes compress more time into each bar." },
    { prompt: "A friend says 'it's crashing' on a 1-minute chart while the daily is in a steady uptrend. Who's right?", choices: ["Your friend", "Both describe different scales; neither is wrong", "The daily chart only"], answer: 1, explain: "Both are real. What matters is knowing which scale your trade lives on." },
    { prompt: "Before judging any chart, the first thing to check is:", choices: ["The news", "The timeframe", "The colour of the last candle", "The volume"], answer: 1, explain: "Always know what scale you're on." },
    { prompt: "How many 5-minute candles make one hour?", choices: ["5", "6", "12", "60"], answer: 2, explain: "60 minutes / 5 minutes = 12 candles." },
    { prompt: "The 4-hour and 1-hour charts point the same way. Your targets can be:", choices: ["Further", "Closer", "Unchanged", "Ignored"], answer: 0, explain: "When timeframes agree, the trade can run further. When they disagree, take safer targets." },
  ],
  "candle-anatomy": [
    { prompt: "A green candle means:", choices: ["Price closed above where it opened", "Price closed below where it opened", "Price didn't move", "Volume was high"], answer: 0, explain: "Green: close above open. Buyers won that period." },
    { prompt: "A candle opened at 100, hit 104, dropped to 99, and closed at 103. What is its body?", choices: ["99 to 104", "100 to 103", "103 to 104", "99 to 100"], answer: 1, explain: "The body is open to close. The wicks reach 104 above and 99 below." },
    { prompt: "A red candle opened at 50 and closed at 48. Where is its high?", choices: ["Exactly 50", "Exactly 48", "At 50 or above", "At 48 or below"], answer: 2, explain: "The high can't be below the open. It's 50 if there's no upper wick, or above 50 if there is." },
    { prompt: "The four prices in every candle are:", choices: ["Open, high, low, close", "Bid, ask, last, volume", "Start, middle, end, average", "High, low, VWAP, close"], answer: 0, explain: "OHLC. The body is open-to-close, the wicks reach the high and low." },
    { prompt: "A red candle's close is:", choices: ["Above its open", "Below its open", "Equal to its high", "Equal to its low"], answer: 1, explain: "Red means it closed lower than it opened." },
    { prompt: "A candle with no wicks at all means:", choices: ["The open and close were the high and low", "No trades happened", "It's a daily candle", "The data is broken"], answer: 0, explain: "Price never went beyond the body. That's a strong, one-directional period." },
  ],
  "candle-patterns": [
    { prompt: "A candle with a tiny body and a very long upper wick tells you:", choices: ["Buyers pushed up and held it", "Buyers pushed up but sellers took it back", "Nothing happened", "The market was closed"], answer: 1, explain: "The high was reached, then price fell back near the open. The push up failed." },
    { prompt: "Several candles in a row have long lower wicks ending at about the same price. What is that?", choices: ["Random noise", "Buyers repeatedly defending a level", "A guaranteed breakout coming", "Sellers in control"], answer: 1, explain: "Each wick is a failed attempt to go lower. Repeated at one price, that's a level the market respects." },
    { prompt: "Which candle shows sellers being overpowered within the period?", choices: ["Big red body, no wicks", "Tiny body, long lower wick", "Tiny body, long upper wick", "Big green body, no wicks"], answer: 1, explain: "Sellers drove price to the low, then buyers pushed it all the way back." },
    { prompt: "A bearish engulfing candle is:", choices: ["A red candle whose body covers the previous green body", "Any red candle", "A green candle with a long wick", "Two red candles in a row"], answer: 0, explain: "The red body swallows the green one before it. Sellers took everything buyers had just gained." },
    { prompt: "A bullish engulfing candle right after a weak break *below* a range suggests:", choices: ["The break is continuing", "The break failed and buyers took over", "Nothing", "Volume is low"], answer: 1, explain: "Failed break plus engulfing reversal. Buyers overwhelmed the sellers who chased the break." },
    { prompt: "A long wick poking out of a range that closes back inside is:", choices: ["A confirmed breakout", "A failed break", "A new trend", "Irrelevant"], answer: 1, explain: "The wick went through, the close didn't. That's a failed break." },
  ],
  trend: [
    { prompt: "A chart is in a clear bull trend. Which trade should you never take?", choices: ["A long", "A short", "No trade at all"], answer: 1, explain: "Know the direction of the trend and never trade against it." },
    { prompt: "A bull trend is:", choices: ["Higher highs and higher lows", "Lower highs and lower lows", "Flat highs and flat lows", "More green candles than red"], answer: 0, explain: "Each push up goes further, each pullback stops higher." },
    { prompt: "A bear trend is:", choices: ["Higher highs and higher lows", "Lower highs and lower lows", "A single big red candle", "Price below the open"], answer: 1, explain: "Each bounce tops out lower, each drop goes lower." },
    { prompt: "You can't tell if the chart is bullish or bearish. You should:", choices: ["Assume bullish", "Assume bearish", "Be careful; no clear trend means no assumptions", "Trade both ways"], answer: 2, explain: "If you can't name it, you don't have one. NO ASSUMPTIONS." },
    { prompt: "The 4-hour is bullish, the 1-hour is bearish. You should:", choices: ["Short the 1-hour with big targets", "Be more careful and take safer, closer targets", "Ignore the 4-hour", "Flip a coin"], answer: 1, explain: "When timeframes disagree, be careful and take safer targets." },
    { prompt: "Trying to pick the exact top of a bull trend is:", choices: ["Smart if you're quick", "Trading against the trend; don't", "Only OK on Fridays", "Required for 0DTE"], answer: 1, explain: "Do not try to pick tops and bottoms. Consistency comes first." },
  ],
  "support-resistance": [
    { prompt: "Price has bounced up off $94 four times. What is $94?", choices: ["Resistance", "Support", "A trendline", "The open"], answer: 1, explain: "A level price keeps bouncing up from is support. Buyers defend it." },
    { prompt: "Price keeps getting pushed down from $106. What is $106?", choices: ["Support", "Resistance", "VWAP", "The ORB"], answer: 1, explain: "A ceiling sellers keep defending is resistance." },
    { prompt: "What's the difference between support/resistance and a rejection?", choices: ["They're the same thing", "S/R is a level price bounces off repeatedly; a rejection is a move that fully returns to where it started", "A rejection only happens on a 1-minute chart", "Support only exists in bull trends"], answer: 1, explain: "A level holds repeatedly. A rejection is one round trip." },
    { prompt: "The strongest support levels come from:", choices: ["The 1-minute chart", "The daily chart", "Yesterday's lunch hour", "The news"], answer: 1, explain: "Big levels come from big timeframes." },
  ],
  retest: [
    { prompt: "Price breaks above a resistance level at $106. What often happens next?", choices: ["It never returns to $106", "It comes back to retest $106, now as support", "It immediately reverses into a bear trend", "Nothing can be said"], answer: 1, explain: "Broken levels flip roles. Old resistance becomes new support." },
    { prompt: "After a breakout above resistance, the best-odds entry is usually:", choices: ["Chasing the breakout candle", "The retest of the broken level", "Waiting for a new all-time high", "Shorting the breakout"], answer: 1, explain: "Let it come back. The retest gives you a defined level to trade from." },
    { prompt: "Price breaks below support and then returns to it from underneath. That level is now acting as:", choices: ["Support", "Resistance", "A trendline", "Nothing"], answer: 1, explain: "Broken support becomes resistance on the retest." },
  ],
  trendlines: [
    { prompt: "You're drawing a trendline on a bull trend. Which points do you connect?", choices: ["The swing highs", "The swing lows", "The closes", "The volume bars"], answer: 1, explain: "Uptrend: connect the lows." },
    { prompt: "In a downtrend, a trendline connects:", choices: ["The swing lows", "The swing highs", "The opens", "VWAP"], answer: 1, explain: "Downtrend: connect the highs." },
    { prompt: "A trendline that price has touched twice is:", choices: ["Confirmed and tradeable", "A guess until a third touch", "Always resistance", "Useless"], answer: 1, explain: "Two points define any line. The third touch shows the market respects it." },
    { prompt: "Connecting the highs in an uptrend is:", choices: ["The standard trendline", "Not reliable enough to trade from", "Required", "The same as VWAP"], answer: 1, explain: "Lows in an uptrend, highs in a downtrend. The other way isn't reliable." },
  ],
  targets: [
    { prompt: "You're going long. Where is your first target?", choices: ["The most obvious resistance above", "The most obvious support below", "Double your entry", "Wherever feels right"], answer: 0, explain: "Long: target the obvious resistance. Short: target the obvious support." },
    { prompt: "Resistance is at $106.00. Where should your sell target sit?", choices: ["Exactly $106.00", "A little below, like $105.80", "Above, like $106.50", "It doesn't matter"], answer: 1, explain: "A few ticks before the level makes sure you get filled." },
    { prompt: "Your long rallies but stalls well short of the resistance target, then starts dropping. That tells you:", choices: ["Keep holding", "The opposing trend is stronger than it looked", "Add more", "Resistance moved"], answer: 1, explain: "Failure to reach the obvious level is information. Lock in what you have." },
    { prompt: "You're short. Your first target is:", choices: ["The nearest obvious support below", "The nearest resistance above", "Yesterday's high", "Zero"], answer: 0, explain: "Short: the most obvious support first." },
    { prompt: "A winner that turns into a loser is:", choices: ["Bad luck", "A discipline problem: you didn't lock in profit", "Normal", "The market's fault"], answer: 1, explain: "Always lock in your profits." },
  ],
  process: [
    { prompt: "A big economic announcement is in 40 minutes. You see a setup you like. You:", choices: ["Take it", "Skip it; be flat at least an hour before major news", "Take it with double size"], answer: 1, explain: "News overrides the chart." },
    { prompt: "Which of these is a high-probability trade?", choices: ["Shorting the top of a strong bull trend because 'it has to turn'", "A continuation entry with the trend after a retest", "Buying because a friend said so", "Any trade right after a big news release"], answer: 1, explain: "Continuations with the trend. Picking tops and bottoms is how win rates die." },
    { prompt: "You feel rushed and haven't finished your checklist. The entry is now or never. You:", choices: ["Enter now", "Let it go", "Enter with half size"], answer: 1, explain: "Never trade in a rush. There's always another trade." },
    { prompt: "Rule number one is:", choices: ["Buy low, sell high", "Consistency comes before all else", "Never miss a move", "Always be in a trade"], answer: 1, explain: "Consistency first. Everything else follows." },
    { prompt: "The market thinks in terms of:", choices: ["Trends, rejections and zones", "Luck", "News headlines", "Round numbers only"], answer: 0, explain: "Trends, rejections, zones. Learn to see those three." },
    { prompt: "A price void is:", choices: ["A gap in the chart data", "An area with little prior price action that price can move through fast", "A broken chart", "A holiday"], answer: 1, explain: "Thin areas get crossed quickly. They're one of the two high-probability trade types." },
  ],
  risk: [
    { prompt: "You skipped a setup because it broke a rule, and it would have won. That decision was:", choices: ["A mistake", "A good decision; judge process, not one outcome", "Proof the rules are wrong"], answer: 1, explain: "Judge decisions by process, not by one result." },
    { prompt: "Your win rate is 54%. Are you profitable?", choices: ["Yes, over 50% always wins", "Can't tell; it depends on average win vs average loss", "No, you need 70%"], answer: 1, explain: "54% with wins bigger than losses is great; 54% with losses bigger than wins loses money." },
    { prompt: "Most of the premium on an option you bought is gone. The rule says to exit. You:", choices: ["Hold and hope", "Exit; the rule is the rule", "Double down"], answer: 1, explain: "Hope is not a plan. Take the small loss and keep your consistency." },
  ],
  "options-basics": [
    { prompt: "You read a clean bull trend and want to trade it with an option. You buy:", choices: ["A call", "A put", "Both", "Neither"], answer: 0, explain: "A call makes money when the stock goes up." },
    { prompt: "You buy a call for $2.00 per share. The stock drops hard. Your maximum loss is:", choices: ["Unlimited", "$2.00 per share ($200 per contract)", "The stock price", "Nothing"], answer: 1, explain: "A buyer can only lose the premium. One contract = 100 shares." },
    { prompt: "A put gives you the right to:", choices: ["Buy shares at the strike", "Sell shares at the strike", "Receive dividends", "Vote"], answer: 1, explain: "Put = right to sell. It gains when the stock falls." },
    { prompt: "You read a bear trend on the daily. The matching option trade is:", choices: ["Buy a call", "Buy a put", "Skip, options can't trade down moves"], answer: 1, explain: "Bearish read, buy a put." },
    { prompt: "One options contract controls:", choices: ["1 share", "10 shares", "100 shares", "1,000 shares"], answer: 2, explain: "100 shares per contract. A $1.50 premium costs $150." },
    { prompt: "You paid $3.00 for a put. The stock rips higher. Your loss is at most:", choices: ["$300 per contract", "Unlimited", "$3 per contract", "The full stock price"], answer: 0, explain: "Premium × 100." },
  ],
  "strikes-expiry": [
    { prompt: "The stock is at $100. Which call is cheapest?", choices: ["$90 strike", "$100 strike", "$110 strike"], answer: 2, explain: "The $110 call is furthest OTM." },
    { prompt: "A call is in the money when:", choices: ["The stock is above the strike", "The stock is below the strike", "It's expiring today", "Delta is 0.20"], answer: 0, explain: "Call ITM: stock above strike. Put ITM: stock below strike." },
    { prompt: "A put with a $110 strike on a $100 stock is:", choices: ["Out of the money", "In the money", "At the money", "Expired"], answer: 1, explain: "Put ITM when the stock is below the strike. $100 < $110." },
    { prompt: "Further out-of-the-money options are:", choices: ["Cheaper and lower probability", "More expensive and safer", "Always better", "Only for 0DTE"], answer: 0, explain: "Cheap because they need a big move to pay." },
    { prompt: "Which expiry loses value fastest per day from time alone?", choices: ["90 days out", "30 days out", "2 days out"], answer: 2, explain: "Theta accelerates into expiry." },
  ],
  greeks: [
    { prompt: "A 0.30-delta call costs $1.00. The stock rises $1. Roughly what is the call worth now?", choices: ["$1.00", "$1.30", "$2.00", "$0.70"], answer: 1, explain: "Delta 0.30 ≈ $0.30 of gain per $1 of stock move." },
    { prompt: "You buy a call with 3 days to expiry. The stock goes nowhere for 3 days. Your option:", choices: ["Keeps its value", "Loses most or all of its value", "Gains value", "Converts to shares"], answer: 1, explain: "No move plus fast theta means the premium melts." },
    { prompt: "Delta is roughly:", choices: ["How much the option moves per $1 of stock, and a rough probability of finishing ITM", "The number of days left", "The premium", "The strike"], answer: 0, explain: "Both readings are useful." },
    { prompt: "Why is 0DTE harder than swing trading?", choices: ["The premiums are bigger", "Theta is extreme, so the move has to happen within hours", "You can't use charts", "It isn't"], answer: 1, explain: "On a 0DTE, being right eventually is the same as being wrong." },
    { prompt: "Theta is:", choices: ["The daily loss of value from time passing", "The strike price", "How much the stock moved", "A type of chart"], answer: 0, explain: "The price of waiting." },
    { prompt: "A 0.70-delta option behaves most like:", choices: ["Owning the stock", "A lottery ticket", "Cash", "A bond"], answer: 0, explain: "High delta moves almost one-for-one with the stock." },
  ],
  routine: [
    { prompt: "Which chart do you draw today's support and resistance from?", choices: ["The 1-minute", "The 5-minute", "The daily", "Whatever's open"], answer: 2, explain: "Big levels come from big timeframes." },
    { prompt: "Which timeframes make up full timeframe continuity?", choices: ["Daily and 4-hour", "Weekly, daily, 4-hour, 1-hour and 15-minute", "1-minute and 5-minute", "Monthly and weekly only"], answer: 1, explain: "1W, 1D, 4H, 1H, 15m." },
    { prompt: "You wake up late; the market opens in 2 minutes and you've drawn nothing. You:", choices: ["Trade the first candle", "Do the routine first; if you miss the open, you miss it", "Guess the levels from memory"], answer: 1, explain: "No map, no trade. There's a 1pm window too." },
    { prompt: "Put the morning in order: (A) draw PMH/PML, (B) daily S/R and trendlines, (C) MA bias and FTFC, (D) mark PDH/PDL at the open.", choices: ["A, B, C, D", "B, C, A, D", "D, A, B, C", "C, B, D, A"], answer: 1, explain: "Big levels, then bias, then premarket, then yesterday's range at the open." },
    { prompt: "The weekly, daily and 4-hour are bullish but the 1-hour and 15-minute are making lower lows. You have:", choices: ["Full timeframe continuity", "Partial continuity: be more careful, safer targets", "A bearish bias"], answer: 1, explain: "The big timeframes still lean long, the small ones disagree. Safer targets and patience." },
    { prompt: "What do you draw first in the morning?", choices: ["PMH and PML", "Daily support/resistance and trendlines", "The ORB", "PDH/PDL"], answer: 1, explain: "Daily levels first. They're the walls." },
  ],
  bias: [
    { prompt: "Price above the 9, the 9 above the 21, the 21 above the 50. The bias is:", choices: ["Bullish", "Bearish", "No bias"], answer: 0, explain: "Stacked bullish. Lean long." },
    { prompt: "Price is crossing back and forth through tangled moving averages. The bias is:", choices: ["Bullish", "Bearish", "No bias: be careful"], answer: 2, explain: "No order, no bias. The ORB had better be very clean." },
    { prompt: "Your bias is bearish but the first candle rips through the premarket high. You:", choices: ["Short it", "Don't fight it; tight-target long or wait", "Double your short"], answer: 1, explain: "Bias is a lean, not a law." },
    { prompt: "Which moving averages track the short-term trend?", choices: ["9 and 21", "100 and 200", "50 only", "VWAP"], answer: 0, explain: "9/21 short-term, 50 swing, 100/200 big picture." },
    { prompt: "Price below the 9, 21 and 50, which are stacked downward. Bias:", choices: ["Bullish", "Bearish", "No bias"], answer: 1, explain: "Stacked bearish. Lean short." },
  ],
  "key-levels": [
    { prompt: "The 15-minute opening range is:", choices: ["The first 5-minute candle's high and low", "The high and low of the first three 5-minute candles", "Yesterday's range", "The premarket range"], answer: 1, explain: "9:30, 9:35, 9:40. Drawn as a box." },
    { prompt: "You go long off the open. Your first target is:", choices: ["The nearest of PDH or a daily resistance above", "Always PDH, no matter how far", "Double the ORB height", "Wherever it's at 10:30"], answer: 0, explain: "Nearest obvious level first. Lock in profit there." },
    { prompt: "Price breaks above the ORB box but the 5-minute candle closes back below the PMH. Is that continuation?", choices: ["Yes, it broke the ORB", "Not yet; you need a 5-minute close beyond the PMH/PML", "Only after 10:30"], answer: 1, explain: "ORB break is the setup; the close through the premarket level is the confirmation." },
    { prompt: "PMH stands for:", choices: ["Previous month high", "Premarket high", "Price moving high", "Post-market high"], answer: 1, explain: "The high of the premarket session. Blue dashed line." },
    { prompt: "PDL is:", choices: ["Yesterday's low", "Today's low", "The premarket low", "The ORB low"], answer: 0, explain: "Previous day low. Yellow dashed line. An obvious target for shorts." },
    { prompt: "VWAP is:", choices: ["The volume-weighted average price of the session", "Yesterday's close", "A moving average of highs", "The ORB midpoint"], answer: 0, explain: "Where the average dollar traded today. Price above it leans bullish, below leans bearish." },
  ],
  orb: [
    { prompt: "The ideal continuation trade is:", choices: ["Any break of the ORB", "ORB break, then a 5-minute close beyond PMH/PML on strong volume, early", "A break after 11am", "A wick through PDH"], answer: 1, explain: "Break, confirm with the close, check the volume, and early is better." },
    { prompt: "Price pokes out of the ORB box on thin volume and closes back inside. You:", choices: ["Chase the poke", "Don't chase; a failed break likely reverses. Watch for an engulfing reversal candle", "Short immediately", "Go long"], answer: 1, explain: "A break without volume is a question, not an answer." },
    { prompt: "A weak break above the ORB is followed by a 5-minute bearish engulfing candle. The reversal trade is:", choices: ["Long to PDH", "Short after the engulfing candle closes, targeting the bottom of the ORB box", "Skip always", "Long to PMH"], answer: 1, explain: "Enter on the close of the engulfing candle, target the opposite side of the box." },
    { prompt: "Where do you enter the failed-breakout reversal?", choices: ["As soon as the wick pokes out", "After the engulfing reversal candle closes", "At the ORB midpoint", "At PDH"], answer: 1, explain: "Wait for the close. The close is what confirms the engulfing." },
    { prompt: "The first 5-minute candle closes straight through the PML. That is:", choices: ["An open drive: quick short to the nearest support/PDL", "A failed break", "Chop", "A reason to wait for the ORB"], answer: 0, explain: "Open drive. No waiting for the ORB." },
    { prompt: "Price has run from the ORB to just under PDH. A friend wants to buy here. That's:", choices: ["Fine, it's strong", "Chasing the top; the entry was at the break, the target is here", "A reversal trade", "A 0DTE rule"], answer: 1, explain: "Don't buy at the top. By the time price is at the target, the trade is ending, not starting." },
    { prompt: "What makes an ORB break trustworthy?", choices: ["Volume on the breakout candle and a close beyond the level", "The colour of the candle", "The time being after lunch", "A tweet"], answer: 0, explain: "Volume plus a close. Without those, assume it can fail." },
  ],
  regime: [
    { prompt: "SPY: price above the 20 EMA, 20 EMA above the 50 SMA, 50 SMA rising, higher highs and higher lows. Regime:", choices: ["Trending bullish", "Trending bearish", "Range / chop", "Transition"], answer: 0, explain: "All four boxes ticked. Bullish swing setups are allowed." },
    { prompt: "SPY: flat 20 EMA, flat 50 SMA, price crossing both repeatedly, several failed breakouts. Regime:", choices: ["Trending bullish", "Trending bearish", "Range / chop", "Transition"], answer: 2, explain: "Chop. Reduce or reject bullish setups unless the stock shows exceptional relative strength." },
    { prompt: "The moving averages are just starting to change slope and price is reclaiming the 50 SMA. Regime:", choices: ["Trending bullish", "Range / chop", "Transition", "Trending bearish"], answer: 2, explain: "Transition: structure forming, not confirmed. Smaller size, more patience." },
    { prompt: "Which two tickers set the market regime for most swing setups?", choices: ["SPY and QQQ", "AAPL and TSLA", "GLD and TLT", "VIX and DXY"], answer: 0, explain: "SPY for the broad market, QQQ for tech/growth. IWM for small caps when relevant." },
    { prompt: "Before accepting ANY swing setup you must first:", choices: ["Check the 15-minute chart", "Determine the broader market regime", "Pick a strike", "Check RSI"], answer: 1, explain: "Regime first. A great chart in a chop regime is still a downgrade." },
    { prompt: "The range-bound filter is:", choices: ["A suggestion", "A hard filter: NO TRADE — RANGE", "Only for small caps", "Optional on Fridays"], answer: 1, explain: "Hard filter. Do not force a trade." },
    { prompt: "Which is a range-bound warning sign?", choices: ["ATR contracting sharply and overlapping daily candles", "50 SMA rising", "Volume expanding on a breakout", "Higher highs and higher lows"], answer: 0, explain: "Contracting ATR, overlapping candles, flat averages, repeated failed breakouts: range." },
    { prompt: "The market is in chop but a stock is up +3% while SPY is flat and breaking resistance. The setup is:", choices: ["Rejected automatically", "Allowed: exceptional relative strength is the exception to the chop filter", "Only tradeable on 0DTE"], answer: 1, explain: "Exceptional relative strength can override a chop regime. Nothing else does." },
  ],
  "swing-setups": [
    { prompt: "Which chart decides whether a swing setup exists?", choices: ["The 15-minute", "The 1-hour", "The daily", "The weekly only"], answer: 2, explain: "The daily determines the setup. 1H/15m only refine the entry." },
    { prompt: "Every candidate must be classified as one of:", choices: ["Breakout, trend pullback, or reversal", "Long or short", "Call or put", "Gap up or gap down"], answer: 0, explain: "A, B or C. If it doesn't clearly fit one: NO TRADE." },
    { prompt: "Breakout + retest: what must the daily candle do first?", choices: ["Wick above resistance", "Close above a clearly established resistance, ideally on above-average volume", "Touch the 200 SMA", "Gap"], answer: 1, explain: "A close above, on volume. Then wait for the retest." },
    { prompt: "During a healthy retest of broken resistance, selling volume should:", choices: ["Expand", "Contract", "Be irrelevant", "Double"], answer: 1, explain: "Light volume on the retest means sellers aren't pressing. Then a bullish reaction near the level." },
    { prompt: "The 20 EMA pullback setup needs:", choices: ["Price below the 20 EMA for a week", "An established HH/HL uptrend, 20 EMA above 50 SMA, a pullback to the 20 EMA on declining volume", "A gap down", "RSI under 30"], answer: 1, explain: "Trend intact, pullback orderly, volume fading into the average." },
    { prompt: "Which confirmation fits the 20 EMA pullback?", choices: ["A hammer or bullish engulfing candle at the EMA, closing near its high", "Three red candles in a row", "A close below the 50 SMA", "Flat volume"], answer: 0, explain: "A reversal candle at the average, strong close, then break its high." },
    { prompt: "50 SMA reclaim: the mistake to avoid is:", choices: ["Waiting for a pullback", "Buying simply because price crossed the 50 SMA", "Checking volume", "Looking for a higher low"], answer: 1, explain: "The cross is the start. You want base → reclaim → pullback that holds → higher low → continuation." },
    { prompt: "A bull flag consolidation should:", choices: ["Retrace most of the impulse", "Be tight, with declining volume, higher lows, and stay above the 20 EMA", "Be as wide as possible", "Show heavy selling volume"], answer: 1, explain: "Tight and quiet. Wide, heavy-volume flags are not flags." },
    { prompt: "The previous-week-high break setup wants:", choices: ["A stock in a bear trend", "A trending stock consolidating just under last week's high, then breaking it on volume with a strong close", "A gap below last week's low", "RSI divergence"], answer: 1, explain: "Trend, tight consolidation under the level, break with volume and relative strength." },
    { prompt: "Anchored VWAP can be anchored from:", choices: ["Any random bar", "A significant event: earnings, major gap, major swing high/low, big news candle", "Only the year open", "The last 5-minute candle"], answer: 1, explain: "Anchor where something happened. The reclaim and hold is the setup." },
    { prompt: "RSI bullish divergence means:", choices: ["Price higher high, RSI higher high", "Price lower low, RSI higher low", "RSI under 30", "RSI over 70"], answer: 1, explain: "Price keeps falling, momentum doesn't. Only matters near meaningful daily support, and never enter on RSI alone." },
    { prompt: "Stock +3.0%, benchmark +0.5%. Relative strength:", choices: ["+3.5%", "+2.5%", "+0.5%", "-2.5%"], answer: 1, explain: "3.0 − 0.5 = +2.5%. Strong." },
    { prompt: "Relative strength is:", choices: ["A standalone entry signal", "A confirmation factor combined with one of the primary setups", "Only for ETFs", "Irrelevant for swings"], answer: 1, explain: "Confirmation, not entry. Pair it with a breakout, pullback, flag, prior-week-high break or 50 SMA reclaim." },
    { prompt: "A breakout on extremely high volume that fails the very next day is:", choices: ["A buy", "An avoid; exhaustion, not strength", "A pullback", "A flag"], answer: 1, explain: "Climactic volume followed by immediate failure is an avoid." },
    { prompt: "The most important question for any swing candidate is:", choices: ["How many indicators agree?", "Why should this stock move directionally over the next 1–3 weeks?", "What's the premium?", "Is RSI oversold?"], answer: 1, explain: "No clear answer, no trade. Indicator counting is not a thesis." },
  ],
  "swing-entry": [
    { prompt: "Preferred entry on a breakout + retest:", choices: ["The breakout close", "The break above the high of the bullish retest candle", "The next morning's open", "Any time"], answer: 1, explain: "Preferred: break of the retest candle's high. Aggressive: the breakout close." },
    { prompt: "Invalidation for a breakout + retest is:", choices: ["A 2% drop", "A daily close back below the former resistance, or a break of the retest swing low", "Any red candle", "RSI under 50"], answer: 1, explain: "Define it before the option. If it's hit, the thesis is wrong." },
    { prompt: "Before you even look at an option, you must determine:", choices: ["The strike", "The exact underlying price that invalidates the setup", "The expiry", "The bid/ask"], answer: 1, explain: "Step 3 of the workflow. Invalidation first." },
    { prompt: "The 15-minute chart is for:", choices: ["Deciding whether the setup exists", "Execution timing only", "Overriding the daily", "Setting the target"], answer: 1, explain: "15m times the entry. It never overrides a poor daily structure." },
    { prompt: "A bullish 15-minute pattern against a bearish daily structure is:", choices: ["A long", "Noise; the daily rules", "A short", "A flag"], answer: 1, explain: "Do not allow intraday noise to override the daily." },
    { prompt: "On the 1-hour chart, entry refinement looks for:", choices: ["A higher low, VWAP or 20 EMA reclaim, a local resistance break, volume expansion", "RSI over 70", "The 200 SMA", "A gap"], answer: 0, explain: "The 1H confirms the turn inside the daily setup." },
    { prompt: "Minimum reward-to-risk to prefer:", choices: ["1R", "2R where structure permits", "10R", "There is no minimum"], answer: 1, explain: "Target the next major daily resistance or prior swing high; prefer at least 2R." },
    { prompt: "The target for a 20 EMA pullback long:", choices: ["The 20 EMA", "Prior swing high / new high / next daily resistance", "Yesterday's low", "The strike"], answer: 1, explain: "Back to the prior high, then the next level." },
    { prompt: "Invalidation for a 50 SMA reclaim:", choices: ["Any close below the 20 EMA", "A daily close back below the 50 SMA combined with loss of the recent swing low", "A red day", "RSI under 40"], answer: 1, explain: "Both: back under the average and the swing low gone." },
    { prompt: "Workflow order:", choices: ["15m → 1H → daily", "Daily → classify setup → invalidation → 1H → 15m → option", "Option → daily → 15m", "Regime → option → daily"], answer: 1, explain: "Daily decides, then classify, then invalidation, then refine down, then pick the option last." },
  ],
  "swing-options": [
    { prompt: "Preferred expiry window for a swing:", choices: ["0–2 DTE", "7–21 DTE", "60–90 DTE", "LEAPS"], answer: 1, explain: "One to three weeks. Enough time for the daily move, not so much you pay for it." },
    { prompt: "Preferred strikes for a swing:", choices: ["Far OTM for leverage", "ATM or slightly ITM", "Deep ITM only", "Whatever's cheapest"], answer: 1, explain: "ATM / slightly ITM. Avoid unnecessarily far OTM contracts." },
    { prompt: "Which option is the swing shape?", choices: ["0.15 delta, 3 DTE", "0.55 delta, 14 DTE", "0.90 delta, 120 DTE", "0.20 delta, 45 DTE"], answer: 1, explain: "Near the money, a couple of weeks out." },
    { prompt: "The option should have:", choices: ["A wide bid/ask spread", "Adequate liquidity, tight spread, good open interest, sufficient delta", "No open interest", "Maximum premium"], answer: 1, explain: "You need to get in and out at a fair price." },
    { prompt: "Before selecting the strike you must evaluate:", choices: ["The expected underlying move", "The colour of the candle", "The time of day", "The VIX"], answer: 0, explain: "Expected move first. The strike and premium have to make sense against it." },
    { prompt: "A $2 premium on a stock you expect to move $1.50 is:", choices: ["Fine", "Excessive premium relative to the expected move; avoid", "A great deal", "Standard"], answer: 1, explain: "If the move can't pay for the premium, the trade can't work." },
    { prompt: "The objective of the swing library is:", choices: ["The maximum number of trades", "A small number of liquid stocks with clear direction, structure, invalidation and room", "One trade per day", "Beating 0DTE"], answer: 1, explain: "Few, clean, liquid. When those conditions are absent: NO TRADE." },
    { prompt: "Setup status options are:", choices: ["Buy / Sell", "TRADE / WAIT / NO TRADE", "Long / Short / Hedge", "Yes / No"], answer: 1, explain: "Three outcomes, and WAIT is common." },
  ],
  clock: [
    { prompt: "It's 11:15 CST. You see something that looks like a setup. You:", choices: ["Take it", "Leave it; the morning window is closed and midday is chop", "Take it with 0DTE"], answer: 1, explain: "Be done by 10:30. Next look is 1:00 to 2:00." },
    { prompt: "It's 2:30 CST and you want to trade a clean afternoon breakout. Which expiry?", choices: ["0DTE", "1 or 2 DTE", "30 DTE", "Doesn't matter"], answer: 1, explain: "After 2:00 a 0DTE is melting too fast." },
    { prompt: "Why is the open-drive trade most reliable in the first half hour?", choices: ["Theta is lowest then", "Volume is highest then, so moves follow through", "Market makers are asleep", "It isn't"], answer: 1, explain: "Early volume is what makes a break stick." },
    { prompt: "It's 10:25 and your long is 20 cents short of PDH and stalling. You:", choices: ["Hold for PDH", "Lock in the profit", "Add"], answer: 1, explain: "Target a little short, lock in profit, be done by 10:30." },
    { prompt: "The morning trading window ends around:", choices: ["9:45 CST", "10:30 CST", "12:00 CST", "3:00 CST"], answer: 1, explain: "Done by 10:30. Then maybe 1:00 to 2:00." },
    { prompt: "The afternoon window is:", choices: ["11:00 to 12:00", "1:00 to 2:00 CST", "2:30 to 3:00", "There isn't one"], answer: 1, explain: "1pm to 2pm. After 2pm, 1 or 2 DTE only." },
  ],
};

// ---------- factories ----------

export function choiceFrom(r: R, tag: ConceptTag, id: string): ChoiceExercise | null {
  const pool = POOLS[tag];
  if (!pool || pool.length === 0) return null;
  const q = r.pick(pool);
  return { id, type: "choice", tag, ...q };
}

export function classifyDrill(r: R, id: string, structure?: Structure): ClassifyExercise {
  const s = structure ?? r.pick(["bull", "bear", "range"] as const);
  const explain = { bull: "Higher highs and higher lows: bull.", bear: "Lower highs and lower lows: bear.", range: "Level highs and lows: no trend. Be careful." }[s];
  return { id, type: "classify", tag: "trend", prompt: "What is this chart doing?", chart: { seed: r.int(1e6), structure: s, bars: 50 }, explain };
}

export function swingsDrill(r: R, id: string, tag: ConceptTag = "trend"): TapSwingsExercise {
  const s = r.pick(["bull", "bear", "range"] as const);
  const target = s === "bear" ? "highs" : s === "bull" ? "lows" : r.pick(["highs", "lows"] as const);
  const prompt = tag === "trendlines"
    ? `This is a ${s === "bear" ? "bear" : "bull"} trend. Tap the points you'd connect for a trendline.`
    : `Tap every swing ${target === "highs" ? "high" : "low"} on this chart.`;
  return { id, type: "tap-swings", tag, prompt, chart: { seed: r.int(1e6), structure: tag === "trendlines" && s === "range" ? "bull" : s, bars: 45 }, target: tag === "trendlines" ? (s === "bear" ? "highs" : "lows") : target, explain: target === "highs" ? "The peaks. Each one is a swing high." : "The troughs. Each one is a swing low." };
}

export function candleDrill(r: R, id: string): TapCandleExercise {
  const answer = r.pick(["body", "upper-wick", "lower-wick"] as const);
  const prompts = {
    body: ["Tap the body of this candle.", "Tap the part that shows the open-to-close range."],
    "upper-wick": ["Tap the upper wick.", "Tap the part showing the highest price reached.", "Tap the wick that shows a failed push to the upside."],
    "lower-wick": ["Tap the lower wick.", "Tap the part showing the lowest price reached.", "Tap the wick that shows a failed push to the downside."],
  };
  return { id, type: "tap-candle", tag: "candle-anatomy", prompt: r.pick(prompts[answer]), bullish: r.next() < 0.5, answer, explain: { body: "Open to close is the body.", "upper-wick": "The upper wick runs from the top of the body to the high.", "lower-wick": "The lower wick runs from the bottom of the body to the low." }[answer] };
}

export function dailyReplay(r: R, id: string): ReplayExercise {
  const s = r.pick(["bull", "bear", "range"] as const);
  return { id, type: "replay", tag: "trend", prompt: "Long, short, or skip?", chart: { seed: r.int(1e6), structure: s, bars: 60 }, reveal: 40, explain: { bull: "Higher highs and higher lows into the right edge. With the trend means long.", bear: "Lower highs, lower lows. Short with the trend.", range: "No trend. You don't trade what you can't name." }[s] };
}

const ORB_SCENARIOS: IntradayScenario[] = ["continuation-up", "continuation-down", "failed-up", "failed-down", "reversal-short", "reversal-long", "chop"];
const ORB_EXPLAIN: Record<IntradayScenario, string> = {
  "open-drive-up": "First candle closed above the PMH on heavy opening volume. Quick long to the nearest resistance / PDH.",
  "open-drive-down": "First candle closed through the PML on volume. Quick short to the nearest support / PDL.",
  "continuation-up": "Broke the ORB box and closed above PMH on volume. Continuation long toward PDH.",
  "continuation-down": "Broke the ORB box and closed below PML with volume. Short toward PDL.",
  "failed-up": "The wick went above the box but the candle closed back inside on weak volume. Failed break. Don't chase; wait for the reversal candle.",
  "failed-down": "Poked under the box, closed back inside, no volume. Failed break. Wait.",
  "reversal-short": "Weak break above the box, then a bearish engulfing candle on volume. Short on its close, target the bottom of the ORB box.",
  "reversal-long": "Weak break below the box, then a bullish engulfing candle on volume. Long on its close, target the top of the ORB box.",
  chop: "Never left the range. No trade.",
};
const ORB_PROMPT: Record<IntradayScenario, string> = {
  "open-drive-up": "First candle just closed. Long, short, or wait?",
  "open-drive-down": "First candle just closed. Long, short, or wait?",
  "reversal-short": "A candle just closed after the ORB poke. Long, short, or skip?",
  "reversal-long": "A candle just closed after the ORB poke. Long, short, or skip?",
  "continuation-up": "First 5-minute close after the ORB. Long, short, or skip?",
  "continuation-down": "First 5-minute close after the ORB. Long, short, or skip?",
  "failed-up": "First 5-minute close after the ORB. Long, short, or skip?",
  "failed-down": "First 5-minute close after the ORB. Long, short, or skip?",
  chop: "First 5-minute close after the ORB. Long, short, or skip?",
};

export function orbReplay(r: R, id: string, scenario?: IntradayScenario): ReplayExercise {
  const sc = scenario ?? r.pick(ORB_SCENARIOS);
  return { id, type: "replay", tag: "orb", prompt: ORB_PROMPT[sc], chart: { seed: r.int(1e6), structure: "range", scenario: sc }, explain: ORB_EXPLAIN[sc] };
}

export function openDriveReplay(r: R, id: string): ReplayExercise {
  const sc = r.pick(["open-drive-up", "open-drive-down", "chop"] as const);
  return { id, type: "replay", tag: "orb", prompt: ORB_PROMPT[sc], chart: { seed: r.int(1e6), structure: "range", scenario: sc }, explain: sc === "chop" ? "First candle still inside the premarket range. Nothing confirmed; wait for the ORB." : ORB_EXPLAIN[sc] };
}

const SWING_SCENARIOS: SwingScenario[] = ["breakout-retest", "ema-pullback", "bull-flag", "sma50-reclaim", "failed-breakout", "range"];
const SWING_EXPLAIN: Record<SwingScenario, string> = {
  "breakout-retest": "Daily close above a tested resistance on volume, a quiet retest that held, then a bullish candle at the level. Long on the break of its high; invalidation is a close back below the level.",
  "ema-pullback": "Uptrend with higher lows, an orderly pullback to the 20 EMA on fading volume, then a reversal candle closing near its high. Long on the break of that high.",
  "bull-flag": "Strong impulse on volume, a tight consolidation with higher lows and declining volume above the 20 EMA, then a breakout with a strong close. Long.",
  "sma50-reclaim": "Downtrend, base, reclaim of the 50 SMA on volume, a pullback that held it, and a higher low breaking short-term resistance. Long.",
  "failed-breakout": "The breakout close was followed by a large reversal candle back through the level. That's an avoid. Skip.",
  range: "Flat averages, price trapped between obvious support and resistance, overlapping candles. NO TRADE — RANGE.",
};
const SWING_PROMPT: Record<SwingScenario, string> = {
  "breakout-retest": "Daily chart, right edge. Is this a swing long, or no trade?",
  "ema-pullback": "Daily chart, right edge. Swing long, or no trade?",
  "bull-flag": "Daily chart, right edge. Swing long, or no trade?",
  "sma50-reclaim": "Daily chart, right edge. Swing long, or no trade?",
  "failed-breakout": "Daily chart, right edge. Swing long, or no trade?",
  range: "Daily chart, right edge. Swing long, or no trade?",
};

export function swingReplay(r: R, id: string, scenario?: SwingScenario): ReplayExercise {
  const sc = scenario ?? r.pick(SWING_SCENARIOS);
  return { id, type: "replay", tag: "swing-setups", prompt: SWING_PROMPT[sc], chart: { seed: r.int(1e6), structure: "bull", swing: sc }, explain: SWING_EXPLAIN[sc] };
}

/** Name the setup on a daily chart. */
export function nameSetupDrill(r: R, id: string): ChoiceExercise {
  const sc = r.pick(["breakout-retest", "ema-pullback", "bull-flag", "sma50-reclaim"] as const);
  const names = { "breakout-retest": "Breakout + retest", "ema-pullback": "20 EMA trend pullback", "bull-flag": "Bull flag / continuation", "sma50-reclaim": "50 SMA reclaim" };
  const choices = ["Breakout + retest", "20 EMA trend pullback", "Bull flag / continuation", "50 SMA reclaim"];
  return { id, type: "choice", tag: "swing-setups", prompt: "Which setup is this?", choices, answer: choices.indexOf(names[sc]), explain: SWING_EXPLAIN[sc], chart: { seed: r.int(1e6), structure: "bull", swing: sc } };
}

export function regimeDrill(r: R, id: string): ChoiceExercise {
  const s = r.pick(["bull", "bear", "range"] as const);
  return { id, type: "choice", tag: "regime", prompt: "This is SPY. What's the regime?", choices: ["Trending bullish", "Trending bearish", "Range / chop"], answer: { bull: 0, bear: 1, range: 2 }[s], explain: { bull: "Price above the 20 EMA, 20 over 50, 50 rising, HH/HL. Bullish setups allowed.", bear: "Price under both, 20 under 50, 50 falling, LH/LL. No bullish swings.", range: "Flat averages, price crossing them repeatedly. Chop: reject unless exceptional relative strength." }[s], chart: { seed: r.int(1e6), structure: s, bars: 120, emas: [20], mas: [50] } };
}

export function biasDrill(r: R, id: string): ChoiceExercise {
  const s = r.pick(["bull", "bear", "range"] as const);
  return { id, type: "choice", tag: "bias", prompt: "What's the bias on this chart?", choices: ["Bullish", "Bearish", "No bias"], answer: { bull: 0, bear: 1, range: 2 }[s], explain: { bull: "Price above stacked-up averages. Lean long.", bear: "Price under stacked-down averages. Lean short.", range: "Price tangled in the averages. No bias; be careful." }[s], chart: { seed: r.int(1e6), structure: s, bars: 120, mas: [9, 21, 50] } };
}

const TFS: Timeframe[] = ["1W", "1D", "4H", "1H", "15m"];
export function ftfcDrill(r: R, id: string): FtfcExercise {
  const kind = r.pick(["full-up", "full-down", "partial", "partial"] as const);
  const up = kind === "full-up";
  const frames = TFS.map((tf) => ({ tf, up: kind === "partial" ? r.next() < 0.5 : up }));
  if (kind === "partial" && frames.every((f) => f.up === frames[0].up)) frames[4].up = !frames[0].up;
  const ask = r.pick(["bias", "count"] as const);
  return { id, type: "ftfc", tag: "routine", prompt: ask === "bias" ? "Read the FTFC panel. What do you have?" : "How many timeframes agree with the weekly?", frames, ask, explain: kind === "partial" ? "Not all five agree. Partial continuity: be more careful and take safer targets." : `All five point ${up ? "up" : "down"}. Full continuity. Trust the bias and allow further targets.` };
}

export function labDrill(r: R, id: string): OptionsLabExercise {
  const goals = [
    { side: "call", goal: { metric: "moneyness", value: "otm" }, prompt: "Set up an out-of-the-money call.", explain: "Stock at $100: any call strike above $100 is OTM." },
    { side: "put", goal: { metric: "moneyness", value: "itm" }, prompt: "Set up an in-the-money put.", explain: "A put is ITM when the stock is below the strike." },
    { side: "call", goal: { metric: "delta", min: 0.4, max: 0.6 }, prompt: "Set up a call with a delta between 0.40 and 0.60.", explain: "Near the money sits around 0.50 delta." },
    { side: "put", goal: { metric: "delta", min: 0, max: 0.2 }, prompt: "Set up a cheap, low-probability put: delta no bigger than 0.20.", explain: "Far OTM puts have small delta." },
    { side: "call", goal: { metric: "dte", max: 7 }, prompt: "Set up a call with 7 days or less left and watch theta.", explain: "Theta per day grows as expiry nears." },
    { side: "call", goal: { metric: "premium", max: 1 }, prompt: "Make this call cost $1.00 or less per share.", explain: "Cheaper means further OTM, fewer days, or both." },
    { side: "put", goal: { metric: "delta", min: 0.4, max: 0.6 }, prompt: "Set up a swing-style put: delta between 0.40 and 0.60.", explain: "Near the money, weeks out." },
  ] as const;
  const g = r.pick(goals);
  return { id, type: "options-lab", tag: g.goal.metric === "moneyness" ? "strikes-expiry" : "greeks", prompt: g.prompt, side: g.side, goal: g.goal, explain: g.explain };
}

/** One drill for a tag, in a randomly chosen form. */
export function drillFor(r: R, tag: ConceptTag, id: string): Exercise | null {
  const forms: Record<ConceptTag, (() => Exercise | null)[]> = {
    axes: [() => choiceFrom(r, tag, id)],
    timeframes: [() => choiceFrom(r, tag, id)],
    "candle-anatomy": [() => candleDrill(r, id), () => choiceFrom(r, tag, id)],
    "candle-patterns": [() => choiceFrom(r, tag, id)],
    trend: [() => classifyDrill(r, id), () => swingsDrill(r, id), () => dailyReplay(r, id), () => choiceFrom(r, tag, id)],
    "support-resistance": [() => choiceFrom(r, tag, id)],
    rejection: [() => choiceFrom(r, "support-resistance", id)],
    trendlines: [() => swingsDrill(r, id, "trendlines"), () => choiceFrom(r, tag, id)],
    retest: [() => choiceFrom(r, tag, id)],
    targets: [() => choiceFrom(r, tag, id)],
    risk: [() => choiceFrom(r, tag, id)],
    news: [() => choiceFrom(r, "process", id)],
    process: [() => choiceFrom(r, tag, id), () => dailyReplay(r, id)],
    "options-basics": [() => choiceFrom(r, tag, id)],
    "strikes-expiry": [() => choiceFrom(r, tag, id), () => labDrill(r, id)],
    greeks: [() => choiceFrom(r, tag, id), () => labDrill(r, id)],
    routine: [() => choiceFrom(r, tag, id), () => ftfcDrill(r, id)],
    bias: [() => biasDrill(r, id), () => choiceFrom(r, tag, id)],
    "key-levels": [() => choiceFrom(r, tag, id)],
    orb: [() => orbReplay(r, id), () => orbReplay(r, id), () => choiceFrom(r, tag, id)],
    clock: [() => choiceFrom(r, tag, id)],
    regime: [() => regimeDrill(r, id), () => choiceFrom(r, tag, id)],
    "swing-setups": [() => swingReplay(r, id), () => nameSetupDrill(r, id), () => choiceFrom(r, tag, id)],
    "swing-entry": [() => choiceFrom(r, tag, id), () => swingReplay(r, id)],
    "swing-options": [() => choiceFrom(r, tag, id), () => ({ id, type: "options-lab", tag: "swing-options", prompt: "Set up the swing shape: 7–21 days out, ATM or slightly ITM (delta 0.50–0.70).", side: r.pick(["call", "put"] as const), goal: { metric: "swing" }, explain: "One to three weeks, near the money. That's the swing contract." }) as OptionsLabExercise],
  };
  return r.pick(forms[tag])();
}

/**
 * A review set: `n` drills over `tags`, weighted toward whatever the student
 * has been getting wrong. Tags never attempted count as weak.
 */
export function reviewSet(seed: number, mastery: Mastery, tags: ConceptTag[], n: number): Exercise[] {
  const r = rng(seed);
  const weight = (t: ConceptTag) => {
    const m = mastery[t];
    if (!m || m.attempted === 0) return 2;
    return 0.5 + 2 * (1 - m.correct / m.attempted);
  };
  const out: Exercise[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const total = tags.reduce((s, t) => s + weight(t), 0);
    let x = r.next() * total;
    let tag = tags[0];
    for (const t of tags) {
      x -= weight(t);
      if (x <= 0) {
        tag = t;
        break;
      }
    }
    const ex = drillFor(r, tag, `rv${out.length}`);
    if (ex && !out.some((o) => o.type === "choice" && ex.type === "choice" && o.prompt === ex.prompt)) out.push(ex);
  }
  return out;
}

/** A practice set: `n` drills over the given tags, evenly. */
export function practiceSet(seed: number, tags: ConceptTag[], n: number): Exercise[] {
  const r = rng(seed);
  const out: Exercise[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 10) {
    const ex = drillFor(r, tags[out.length % tags.length], `pr${out.length}`);
    if (ex && !out.some((o) => o.type === "choice" && ex.type === "choice" && o.prompt === ex.prompt)) out.push(ex);
  }
  return out;
}
