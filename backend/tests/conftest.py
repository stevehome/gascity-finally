import pytest
import pytest_asyncio
import api.portfolio
import api.watchlist
import api.chat
import db.schema
from db.schema import init_db
from market import cache as _cache


@pytest_asyncio.fixture(autouse=True)
async def isolated_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(db.schema, "DB_PATH", db_path)
    monkeypatch.setattr(api.portfolio, "DB_PATH", db_path)
    monkeypatch.setattr(api.watchlist, "DB_PATH", db_path)
    monkeypatch.setattr(api.chat, "DB_PATH", db_path)
    await init_db()


@pytest.fixture(autouse=True)
def clear_cache():
    _cache._prices.clear()
    yield
    _cache._prices.clear()
