import { NextRequest, NextResponse } from "next/server";
import { analyzeMarket, createPaperOrder, type PaperSide } from "@/lib/paper-trading";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sam-paper-trading",
    mode: "paper-only",
    capabilities: ["sma20", "rsi14", "trend-analysis", "paper-orders"],
    realMoneyExecution: false,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const operation = body?.operation;

    if (operation === "analyze") {
      const symbol = typeof body?.symbol === "string" ? body.symbol : "";
      const prices = Array.isArray(body?.prices) ? body.prices.map(Number) : [];
      if (!symbol || prices.length < 15) {
        return NextResponse.json({ error: "symbol and at least 15 prices are required." }, { status: 400 });
      }
      const analysis = analyzeMarket(symbol, prices);
      return NextResponse.json({
        mode: "paper-only",
        analysis,
        verification: { status: "not_executed", note: "Analysis only. No order was placed." },
      });
    }

    if (operation === "paper_order") {
      const side = body?.side as PaperSide;
      if (side !== "buy" && side !== "sell") {
        return NextResponse.json({ error: "side must be buy or sell." }, { status: 400 });
      }
      const order = createPaperOrder({
        symbol: typeof body?.symbol === "string" ? body.symbol : "",
        side,
        quantity: Number(body?.quantity),
        price: Number(body?.price),
      });
      return NextResponse.json({
        mode: "paper-only",
        order,
        verification: { status: "verified", note: "Paper order simulated locally by SAM. No real-money order was sent." },
      }, { status: 201 });
    }

    return NextResponse.json({ error: "operation must be analyze or paper_order." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paper trading request failed." }, { status: 400 });
  }
}
