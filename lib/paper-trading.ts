export type PaperSide = "buy" | "sell";
export type PaperOrder = {
  id: string;
  symbol: string;
  side: PaperSide;
  quantity: number;
  price: number;
  notional: number;
  createdAt: string;
  mode: "paper";
};

export type MarketAnalysis = {
  symbol: string;
  price: number;
  sma20: number | null;
  rsi14: number | null;
  trend: "bullish" | "bearish" | "neutral";
  signal: "watch" | "paper_buy" | "paper_sell";
  note: string;
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateSma(prices: number[], period: number): number | null {
  if (period <= 0 || prices.length < period) return null;
  return average(prices.slice(-period));
}

export function calculateRsi(prices: number[], period = 14): number | null {
  if (period <= 0 || prices.length <= period) return null;
  const changes = prices.slice(1).map((price, index) => price - prices[index]);
  const window = changes.slice(-period);
  let gains = 0;
  let losses = 0;
  for (const change of window) {
    if (change > 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function analyzeMarket(symbol: string, prices: number[]): MarketAnalysis {
  const clean = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (clean.length < 15) throw new Error("At least 15 valid positive prices are required.");
  const price = clean.at(-1)!;
  const sma20 = calculateSma(clean, 20);
  const rsi14 = calculateRsi(clean, 14);
  const trend = sma20 === null ? "neutral" : price > sma20 ? "bullish" : price < sma20 ? "bearish" : "neutral";
  const signal =
    trend === "bullish" && rsi14 !== null && rsi14 < 70 ? "paper_buy" :
    trend === "bearish" && rsi14 !== null && rsi14 > 30 ? "paper_sell" :
    "watch";
  return {
    symbol: symbol.trim().toUpperCase(),
    price,
    sma20,
    rsi14,
    trend,
    signal,
    note: "Educational market analysis only. This signal is not financial advice and cannot place a real-money order.",
  };
}

export function createPaperOrder(input: {
  symbol: string;
  side: PaperSide;
  quantity: number;
  price: number;
}): PaperOrder {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) throw new Error("Symbol is required.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Quantity must be positive.");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("Price must be positive.");
  return {
    id: crypto.randomUUID(),
    symbol,
    side: input.side,
    quantity: input.quantity,
    price: input.price,
    notional: input.quantity * input.price,
    createdAt: new Date().toISOString(),
    mode: "paper",
  };
}
