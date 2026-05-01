import asyncio
from contextlib import asynccontextmanager

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles

from api.chat import router as chat_router
from api.health import router as health_router
from api.portfolio import router as portfolio_router
from api.portfolio import _record_snapshot
from api.stream import router as stream_router
from api.watchlist import router as watchlist_router
from db.schema import DB_PATH, init_db
from market.simulator import GBMSimulator

load_dotenv("../.env")

_simulator = GBMSimulator()


async def _snapshot_loop():
    while True:
        await asyncio.sleep(30)
        try:
            async with aiosqlite.connect(DB_PATH) as db:
                await _record_snapshot(db)
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _simulator.start()
    snapshot_task = asyncio.create_task(_snapshot_loop())
    yield
    snapshot_task.cancel()
    await _simulator.stop()


app = FastAPI(lifespan=lifespan)


class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; connect-src 'self'"
        )
        return response


app.add_middleware(CSPMiddleware)

app.include_router(health_router)
app.include_router(stream_router)
app.include_router(portfolio_router)
app.include_router(watchlist_router)
app.include_router(chat_router)

try:
    app.mount("/", StaticFiles(directory="../static", html=True), name="static")
except RuntimeError:
    pass
