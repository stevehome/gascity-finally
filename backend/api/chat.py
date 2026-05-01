import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import aiosqlite
from fastapi import APIRouter
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from api.portfolio import _get_portfolio_data, _record_snapshot
from api.watchlist import _get_watchlist
from db.schema import DB_PATH
from market import cache

router = APIRouter()

USER_ID = "default"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatRequest(BaseModel):
    message: str


class TradeAction(BaseModel):
    ticker: str
    side: str
    quantity: float


class WatchlistChange(BaseModel):
    ticker: str
    action: str


class LLMResponse(BaseModel):
    message: str = ""
    trades: Optional[list[TradeAction]] = None
    watchlist_changes: Optional[list[WatchlistChange]] = None


def _build_portfolio_context(portfolio: dict, watchlist: list[dict]) -> str:
    lines = [
        f"Cash: ${portfolio['cash_balance']:.2f}",
        f"Total value: ${portfolio['total_value']:.2f}",
        f"Unrealized P&L: ${portfolio['total_unrealized_pnl']:.2f}",
        "",
        "Positions:",
    ]
    if portfolio["positions"]:
        for p in portfolio["positions"]:
            lines.append(
                f"  {p['ticker']}: qty={p['quantity']:.2f}, avg_cost=${p['avg_cost']:.2f}, "
                f"price=${p['current_price']:.2f}, pnl=${p['unrealized_pnl']:.2f} ({p['pnl_pct']:.1f}%)"
            )
    else:
        lines.append("  (none)")
    lines += ["", "Watchlist:"]
    for w in watchlist:
        price_str = f"${w['price']:.2f}" if w["price"] else "N/A"
        lines.append(f"  {w['ticker']}: {price_str}")
    return "\n".join(lines)


async def _do_trade(db: aiosqlite.Connection, ticker: str, side: str, quantity: float) -> dict | str:
    """Execute a trade within an existing DB connection. Returns trade dict or error string."""
    ticker = ticker.upper()
    price_data = cache.get(ticker)
    if not price_data:
        return f"No price available for {ticker}"
    price = price_data["price"]

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

    if side == "buy":
        cost = price * quantity
        if cash < cost:
            return f"Insufficient cash for {ticker}: need ${cost:.2f}, have ${cash:.2f}"
        new_cash = cash - cost
        if pos_row:
            old_qty, old_avg = pos_row
            new_qty = old_qty + quantity
            new_avg = (old_avg * old_qty + price * quantity) / new_qty
            await db.execute(
                "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE user_id = ? AND ticker = ?",
                (new_qty, new_avg, _now(), USER_ID, ticker),
            )
        else:
            await db.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), USER_ID, ticker, quantity, price, _now()),
            )
    else:
        if not pos_row or pos_row[0] < quantity:
            owned = pos_row[0] if pos_row else 0
            return f"Insufficient shares of {ticker}: own {owned:.2f}, selling {quantity:.2f}"
        new_cash = cash + price * quantity
        new_qty = pos_row[0] - quantity
        if new_qty < 1e-9:
            await db.execute(
                "DELETE FROM positions WHERE user_id = ? AND ticker = ?", (USER_ID, ticker)
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
        (str(uuid.uuid4()), USER_ID, ticker, side, quantity, price, _now()),
    )
    return {"ticker": ticker, "side": side, "quantity": quantity, "price": price}


async def _do_watchlist_change(db: aiosqlite.Connection, ticker: str, action: str) -> dict | str:
    ticker = ticker.strip().upper()
    if action == "add":
        await db.execute(
            "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, ticker, _now()),
        )
    elif action == "remove":
        await db.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?", (USER_ID, ticker)
        )
    else:
        return f"Unknown watchlist action: {action}"
    return {"ticker": ticker, "action": action}


@router.post("/api/chat")
async def chat(req: ChatRequest):
    is_mock = os.getenv("LLM_MOCK", "false").lower() == "true"

    async with aiosqlite.connect(DB_PATH) as db:
        portfolio = await _get_portfolio_data(db)
        watchlist = await _get_watchlist(db)

        cursor = await db.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (USER_ID,),
        )
        rows = await cursor.fetchall()
        history = [{"role": r[0], "content": r[1]} for r in reversed(rows)]

        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, "user", req.message, None, _now()),
        )
        await db.commit()

        if is_mock:
            llm_resp = LLMResponse(message="Mock response", trades=[], watchlist_changes=[])
        else:
            portfolio_context = _build_portfolio_context(portfolio, watchlist)
            system_content = (
                "You are FinAlly, an AI trading assistant for a simulated portfolio app.\n\n"
                f"Current portfolio:\n{portfolio_context}\n\n"
                "Respond with JSON only, no other text. Schema:\n"
                '{"message": "your response", '
                '"trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}], '
                '"watchlist_changes": [{"ticker": "PYPL", "action": "add"}]}\n\n'
                '"trades" and "watchlist_changes" are optional. '
                'Trade side: "buy" or "sell". Watchlist action: "add" or "remove". '
                "Only generate trades explicitly requested by the user — one entry per ticker. "
                "Never invent or duplicate trades. Be concise and data-driven."
            )
            messages = [{"role": "system", "content": system_content}]
            messages.extend(history)
            messages.append({"role": "user", "content": req.message})

            try:
                groq_key = os.getenv("GROQ_API_KEY")
                if groq_key:
                    client = AsyncOpenAI(
                        api_key=groq_key,
                        base_url="https://api.groq.com/openai/v1",
                    )
                    model = "llama-3.1-8b-instant"
                else:
                    client = AsyncOpenAI(
                        api_key=os.getenv("OPENROUTER_API_KEY"),
                        base_url="https://openrouter.ai/api/v1",
                    )
                    model = "meta-llama/llama-3.1-8b-instruct"
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content
                llm_resp = LLMResponse.model_validate_json(content)
            except (ValidationError, json.JSONDecodeError, ValueError) as e:
                llm_resp = LLMResponse(message=f"Error parsing LLM response: {e}")
            except Exception as e:
                llm_resp = LLMResponse(message=f"LLM error: {e}")

        # Deduplicate: keep first trade per ticker+side
        seen = set()
        deduped = []
        for t in (llm_resp.trades or []):
            key = (t.ticker.upper(), t.side)
            if key not in seen:
                seen.add(key)
                deduped.append(t)
        llm_resp.trades = deduped

        trades_executed = []
        errors = []
        for trade in (llm_resp.trades or []):
            result = await _do_trade(db, trade.ticker, trade.side, trade.quantity)
            if isinstance(result, str):
                errors.append(result)
            else:
                trades_executed.append(result)
        if trades_executed:
            await _record_snapshot(db)
        await db.commit()

        watchlist_changes_executed = []
        for change in (llm_resp.watchlist_changes or []):
            result = await _do_watchlist_change(db, change.ticker, change.action)
            if isinstance(result, str):
                errors.append(result)
            else:
                watchlist_changes_executed.append(result)
        await db.commit()

        actions_data = {
            "trades_executed": trades_executed,
            "watchlist_changes_executed": watchlist_changes_executed,
            "errors": errors,
        }
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, "assistant", llm_resp.message, json.dumps(actions_data), _now()),
        )
        await db.commit()

    return {
        "message": llm_resp.message,
        "trades_executed": trades_executed,
        "watchlist_changes_executed": watchlist_changes_executed,
        "errors": errors,
    }
