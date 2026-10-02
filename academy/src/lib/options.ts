// Black-Scholes, enough for the options lab. Rates are taken as zero: the
// point is to let a student feel strike, time and delta, not price a desk.

export type Side = "call" | "put";

function normCdf(x: number) {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function price(side: Side, S: number, K: number, dte: number, iv: number) {
  const T = Math.max(dte, 0.02) / 365;
  const d1 = (Math.log(S / K) + 0.5 * iv * iv * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  const premium = side === "call" ? S * normCdf(d1) - K * normCdf(d2) : K * normCdf(-d2) - S * normCdf(-d1);
  const delta = side === "call" ? normCdf(d1) : normCdf(d1) - 1;
  // theta per calendar day, as a (negative) dollar amount
  const theta = -(S * iv * Math.exp((-d1 * d1) / 2)) / (Math.sqrt(2 * Math.PI) * 2 * Math.sqrt(T)) / 365;
  return { premium, delta, theta };
}

export function moneyness(side: Side, S: number, K: number): "itm" | "otm" {
  return (side === "call" ? S > K : S < K) ? "itm" : "otm";
}

/** Profit at expiry per share for a long option bought at `paid`. */
export function payoffAtExpiry(side: Side, K: number, paid: number, S: number) {
  const intrinsic = side === "call" ? Math.max(0, S - K) : Math.max(0, K - S);
  return intrinsic - paid;
}
