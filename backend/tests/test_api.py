import pytest
import pytest_asyncio
from datetime import datetime, timezone
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from api.health import router as health_router
from api.watchlist import router as watchlist_router
from api.portfolio import router as portfolio_router
from api.chat import router as chat_router
from market import cache


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(health_router)
    test_app.include_router(watchlist_router)
    test_app.include_router(portfolio_router)
    test_app.include_router(chat_router)
    return test_app


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


def seed(ticker: str, price: float) -> None:
    now = datetime.now(timezone.utc).isoformat()
    cache.update(ticker, price, price, now, "flat")


async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_watchlist_get(client):
    r = await client.get("/api/watchlist")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_watchlist_add(client):
    r = await client.post("/api/watchlist", json={"ticker": "PYPL"})
    assert r.status_code == 200
    tickers = [w["ticker"] for w in r.json()]
    assert "PYPL" in tickers


async def test_watchlist_remove(client):
    await client.post("/api/watchlist", json={"ticker": "TESTX"})
    r = await client.delete("/api/watchlist/TESTX")
    assert r.status_code == 200
    tickers = [w["ticker"] for w in r.json()]
    assert "TESTX" not in tickers


async def test_portfolio_trade_and_summary(client):
    seed("MSFT", 415.0)
    r = await client.post("/api/portfolio/trade", json={"ticker": "MSFT", "quantity": 2, "side": "buy"})
    assert r.status_code == 200
    data = r.json()
    assert data["trade"]["ticker"] == "MSFT"
    assert data["trade"]["quantity"] == 2
    portfolio = data["portfolio"]
    assert "cash_balance" in portfolio
    assert "positions" in portfolio
    assert "total_value" in portfolio


async def test_chat_with_mock(client, monkeypatch):
    monkeypatch.setenv("LLM_MOCK", "true")
    r = await client.post("/api/chat", json={"message": "hello"})
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "Mock response"
    assert "trades_executed" in data
    assert "watchlist_changes_executed" in data
