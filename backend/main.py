import asyncio
from contextlib import asynccontextmanager

import aiosqlite
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.health import router as health_router
from api.portfolio import router as portfolio_router
from api.portfolio import _record_snapshot
from api.stream import router as stream_router
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

app.include_router(health_router)
app.include_router(stream_router)
app.include_router(portfolio_router)

try:
    app.mount("/", StaticFiles(directory="../static", html=True), name="static")
except RuntimeError:
    pass
