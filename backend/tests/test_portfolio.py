import pytest
import pytest_asyncio
from datetime import datetime, timezone
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from api.portfolio import router as portfolio_router
from market import cache


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(portfolio_router)
    return test_app


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


def seed(ticker: str, price: float) -> None:
    now = datetime.now(timezone.utc).isoformat()
    cache.update(ticker, price, price, now, "flat")


async def test_buy_creates_position(client):
    seed("AAPL", 100.0)
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    assert r.status_code == 200
    pos = next(p for p in r.json()["portfolio"]["positions"] if p["ticker"] == "AAPL")
    assert pos["quantity"] == pytest.approx(10.0)
    assert pos["avg_cost"] == pytest.approx(100.0)


async def test_buy_deducts_cash(client):
    seed("AAPL", 100.0)
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 5, "side": "buy"})
    assert r.status_code == 200
    assert r.json()["portfolio"]["cash_balance"] == pytest.approx(9500.0)


async def test_avg_cost_on_second_buy(client):
    seed("AAPL", 100.0)
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    now = datetime.now(timezone.utc).isoformat()
    cache.update("AAPL", 200.0, 100.0, now, "up")
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    r = await client.get("/api/portfolio")
    pos = next(p for p in r.json()["positions"] if p["ticker"] == "AAPL")
    assert pos["avg_cost"] == pytest.approx(150.0)
    assert pos["quantity"] == pytest.approx(20.0)


async def test_partial_sell(client):
    seed("AAPL", 100.0)
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 4, "side": "sell"})
    assert r.status_code == 200
    pos = next(p for p in r.json()["portfolio"]["positions"] if p["ticker"] == "AAPL")
    assert pos["quantity"] == pytest.approx(6.0)


async def test_sell_all_removes_position(client):
    seed("AAPL", 100.0)
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "sell"})
    assert r.status_code == 200
    aapl = [p for p in r.json()["portfolio"]["positions"] if p["ticker"] == "AAPL"]
    assert len(aapl) == 0


async def test_oversell_rejected(client):
    seed("AAPL", 100.0)
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 5, "side": "buy"})
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "sell"})
    assert r.status_code == 400


async def test_insufficient_cash(client):
    seed("AAPL", 10000.0)
    r = await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 2, "side": "buy"})
    assert r.status_code == 400


async def test_pnl_calculation(client):
    seed("AAPL", 100.0)
    await client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 10, "side": "buy"})
    now = datetime.now(timezone.utc).isoformat()
    cache.update("AAPL", 150.0, 100.0, now, "up")
    r = await client.get("/api/portfolio")
    pos = next(p for p in r.json()["positions"] if p["ticker"] == "AAPL")
    assert pos["unrealized_pnl"] == pytest.approx(500.0)
    assert pos["pnl_pct"] == pytest.approx(50.0)
