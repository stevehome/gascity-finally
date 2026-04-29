import asyncio
import math
import random
from datetime import datetime, timezone
from typing import Any

from market import cache
from market.interface import MarketDataProvider

SEED_PRICES: dict[str, float] = {
    "AAPL": 190.0,
    "GOOGL": 175.0,
    "MSFT": 415.0,
    "AMZN": 185.0,
    "TSLA": 175.0,
    "NVDA": 875.0,
    "META": 505.0,
    "JPM": 200.0,
    "V": 275.0,
    "NFLX": 630.0,
}

DRIFT = 0.0001
VOL = 0.002
INTERVAL = 0.5  # seconds between ticks
EVENT_INTERVAL = 30  # seconds between random spike events


class GBMSimulator(MarketDataProvider):
    def __init__(self) -> None:
        self._prices = dict(SEED_PRICES)
        self._task: asyncio.Task | None = None
        self._ticks_since_event = 0
        self._event_threshold = int(EVENT_INTERVAL / INTERVAL)

    async def get_prices(self) -> dict[str, dict[str, Any]]:
        return cache.get_all()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        # Seed cache with initial prices
        now = datetime.now(timezone.utc).isoformat()
        for ticker, price in self._prices.items():
            cache.update(ticker, price, price, now, "flat")

        while True:
            await asyncio.sleep(INTERVAL)
            self._tick()

    def _tick(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        # Shared market factor for correlated moves
        market_z = random.gauss(0, 1)
        self._ticks_since_event += 1

        # Occasional spike event on a random ticker
        event_ticker: str | None = None
        if self._ticks_since_event >= self._event_threshold:
            if random.random() < 0.5:  # 50% chance once threshold reached
                event_ticker = random.choice(list(self._prices.keys()))
                self._ticks_since_event = 0

        for ticker, price in self._prices.items():
            prev = price
            # 70% market factor + 30% idiosyncratic noise
            z = 0.7 * market_z + 0.3 * random.gauss(0, 1)
            gbm_return = (DRIFT - 0.5 * VOL**2) * 1 + VOL * math.sqrt(1) * z
            new_price = price * math.exp(gbm_return)

            if ticker == event_ticker:
                spike = random.uniform(0.02, 0.05) * (1 if random.random() > 0.5 else -1)
                new_price *= 1 + spike

            new_price = round(new_price, 4)
            self._prices[ticker] = new_price

            if new_price > prev:
                direction = "up"
            elif new_price < prev:
                direction = "down"
            else:
                direction = "flat"

            cache.update(ticker, new_price, round(prev, 4), now, direction)
