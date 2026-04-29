from typing import Any

_prices: dict[str, dict[str, Any]] = {}


def update(ticker: str, price: float, prev_price: float, timestamp: str, direction: str) -> None:
    _prices[ticker] = {
        "ticker": ticker,
        "price": price,
        "prev_price": prev_price,
        "timestamp": timestamp,
        "direction": direction,
    }


def get_all() -> dict[str, dict[str, Any]]:
    return dict(_prices)


def get(ticker: str) -> dict[str, Any] | None:
    return _prices.get(ticker)
