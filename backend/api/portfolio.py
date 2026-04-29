import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.schema import DB_PATH
from market import cache

router = APIRouter()

USER_ID = "default"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class TradeRequest(BaseModel):
    ticker: str
    quantity: float
    side: str  # "buy" or "sell"


async def _get_portfolio_data(db: aiosqlite.Connection) -> dict:
    cursor = await db.execute(
        "SELECT cash_balance FROM users_profile WHERE id = ?", (USER_ID,)
    )
    row = await cursor.fetchone()
    cash = row[0] if row else 10000.0

    cursor = await db.execute(
        "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ?", (USER_ID,)
    )
    rows = await cursor.fetchall()

    positions = []
    total_unrealized_pnl = 0.0
    positions_value = 0.0

    for ticker, quantity, avg_cost in rows:
        price_data = cache.get(ticker)
        current_price = price_data["price"] if price_data else avg_cost
        unrealized_pnl = (current_price - avg_cost) * quantity
        pnl_pct = ((current_price - avg_cost) / avg_cost * 100) if avg_cost else 0.0
        positions.append({
            "ticker": ticker,
            "quantity": quantity,
            "avg_cost": avg_cost,
            "current_price": current_price,
            "unrealized_pnl": unrealized_pnl,
            "pnl_pct": pnl_pct,
        })
        total_unrealized_pnl += unrealized_pnl
        positions_value += current_price * quantity

    total_value = cash + positions_value

    return {
        "cash_balance": cash,
        "total_value": total_value,
        "positions": positions,
        "total_unrealized_pnl": total_unrealized_pnl,
    }


async def _record_snapshot(db: aiosqlite.Connection) -> None:
    data = await _get_portfolio_data(db)
    await db.execute(
        "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), USER_ID, data["total_value"], _now()),
    )
    await db.commit()


@router.get("/api/portfolio")
async def get_portfolio():
    async with aiosqlite.connect(DB_PATH) as db:
        return await _get_portfolio_data(db)


@router.post("/api/portfolio/trade")
async def execute_trade(req: TradeRequest):
    ticker = req.ticker.upper()
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    if req.side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Side must be 'buy' or 'sell'")

    price_data = cache.get(ticker)
    if not price_data:
        raise HTTPException(status_code=404, detail=f"No price available for {ticker}")
    price = price_data["price"]

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT cash_balance FROM users_profile WHERE id = ?", (USER_ID,)
        )
        row = await cursor.fetchone()
        cash = row[0] if row else 10000.0

        cursor = await db.execute(
            "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
            (USER_ID, ticker),
        )
        pos_row = await cursor.fetchone()

        if req.side == "buy":
            cost = price * req.quantity
            if cash < cost:
                raise HTTPException(status_code=400, detail="Insufficient cash")
            new_cash = cash - cost

            if pos_row:
                old_qty, old_avg = pos_row
                new_qty = old_qty + req.quantity
                new_avg = (old_avg * old_qty + price * req.quantity) / new_qty
                await db.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = ? AND ticker = ?",
                    (new_qty, new_avg, _now(), USER_ID, ticker),
                )
            else:
                await db.execute(
                    "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), USER_ID, ticker, req.quantity, price, _now()),
                )
        else:  # sell
            if not pos_row or pos_row[0] < req.quantity:
                owned = pos_row[0] if pos_row else 0
                raise HTTPException(
                    status_code=400, detail=f"Insufficient shares: own {owned}, selling {req.quantity}"
                )
            new_cash = cash + price * req.quantity
            new_qty = pos_row[0] - req.quantity
            if new_qty < 1e-9:
                await db.execute(
                    "DELETE FROM positions WHERE user_id = ? AND ticker = ?",
                    (USER_ID, ticker),
                )
            else:
                await db.execute(
                    "UPDATE positions SET quantity = ?, updated_at = ? WHERE user_id = ? AND ticker = ?",
                    (new_qty, _now(), USER_ID, ticker),
                )

        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = ?", (new_cash, USER_ID)
        )
        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, ticker, req.side, req.quantity, price, _now()),
        )
        await db.commit()

        await _record_snapshot(db)

        portfolio = await _get_portfolio_data(db)

    return {
        "trade": {"ticker": ticker, "side": req.side, "quantity": req.quantity, "price": price},
        "portfolio": portfolio,
    }


@router.get("/api/portfolio/history")
async def get_portfolio_history():
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id, total_value, recorded_at FROM portfolio_snapshots WHERE user_id = ? ORDER BY recorded_at",
            (USER_ID,),
        )
        rows = await cursor.fetchall()
    return [{"id": r[0], "total_value": r[1], "recorded_at": r[2]} for r in rows]
