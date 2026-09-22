# SAM Paper Trading

SAM trading is intentionally limited to market analysis and paper trading.

## Supported
- SMA20 trend context
- RSI14 momentum context
- Educational watch / paper-buy / paper-sell signals
- Simulated buy/sell orders

## Safety boundary
- No exchange credentials are accepted by this module.
- No real-money order endpoint exists.
- No exchange API is called.
- Every simulated order is explicitly marked `mode: "paper"`.

API:
- `GET /api/trading/paper`
- `POST /api/trading/paper` with `{ "operation": "analyze", "symbol": "...", "prices": [...] }`
- `POST /api/trading/paper` with `{ "operation": "paper_order", "symbol": "...", "side": "buy|sell", "quantity": 1, "price": 100 }`

This module is for learning/testing, not financial advice.
