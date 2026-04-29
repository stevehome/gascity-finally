import uuid
from datetime import datetime, timezone

import aiosqlite
from fastapi import APIRouter
from pydantic import BaseModel

from db.schema import DB_PATH
from market import cache

router = APIRouter()

USER_ID = "default"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_watchlist(db: aiosqlite.Connection) -> list[dict]:
    cursor = await db.execute(
        "SELECT ticker, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at",
        (USER_ID,),
    )
    rows = await cursor.fetchall()
    result = []
    for ticker, added_at in rows:
        price_data = cache.get(ticker) or {}
        result.append({
            "ticker": ticker,
            "price": price_data.get("price"),
            "prev_price": price_data.get("prev_price"),
            "direction": price_data.get("direction"),
            "added_at": added_at,
        })
    return result


@router.get("/api/watchlist")
async def get_watchlist():
    async with aiosqlite.connect(DB_PATH) as db:
        return await _get_watchlist(db)


class WatchlistAddRequest(BaseModel):
    ticker: str


@router.post("/api/watchlist")
async def add_to_watchlist(req: WatchlistAddRequest):
    ticker = req.ticker.strip().upper()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, ticker, _now()),
        )
        await db.commit()
        return await _get_watchlist(db)


@router.delete("/api/watchlist/{ticker}")
async def remove_from_watchlist(ticker: str):
    ticker = ticker.upper()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
            (USER_ID, ticker),
        )
        await db.commit()
        return await _get_watchlist(db)
