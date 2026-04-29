from abc import ABC, abstractmethod
from typing import Any


class MarketDataProvider(ABC):
    """Abstract interface for market data sources."""

    @abstractmethod
    async def get_prices(self) -> dict[str, dict[str, Any]]:
        """Return current prices for all tracked tickers."""
        ...

    @abstractmethod
    async def start(self) -> None:
        """Start the background price update task."""
        ...

    @abstractmethod
    async def stop(self) -> None:
        """Stop the background price update task."""
        ...
