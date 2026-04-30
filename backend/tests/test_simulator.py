import random
from datetime import datetime, timezone

from market.simulator import GBMSimulator, SEED_PRICES
from market import cache


async def test_all_tickers_present():
    sim = GBMSimulator()
    assert set(sim._prices.keys()) == set(SEED_PRICES.keys())
    assert len(sim._prices) == 10


async def test_prices_within_30pct_after_1000_ticks():
    random.seed(42)
    sim = GBMSimulator()
    now = datetime.now(timezone.utc).isoformat()
    for ticker, price in SEED_PRICES.items():
        cache.update(ticker, price, price, now, "flat")

    for _ in range(1000):
        sim._tick()

    for ticker, seed_price in SEED_PRICES.items():
        final = sim._prices[ticker]
        ratio = final / seed_price
        assert 0.7 <= ratio <= 1.3, f"{ticker}: ratio={ratio:.3f}"


async def test_direction_field_after_tick():
    sim = GBMSimulator()
    now = datetime.now(timezone.utc).isoformat()
    for ticker, price in SEED_PRICES.items():
        cache.update(ticker, price, price, now, "flat")

    sim._tick()

    for ticker in SEED_PRICES:
        data = cache.get(ticker)
        assert data is not None
        assert data["direction"] in ("up", "down", "flat")
