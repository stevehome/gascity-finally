from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.health import router as health_router
from api.stream import router as stream_router
from db.schema import init_db
from market.simulator import GBMSimulator

load_dotenv("../.env")

_simulator = GBMSimulator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _simulator.start()
    yield
    await _simulator.stop()


app = FastAPI(lifespan=lifespan)

app.include_router(health_router)
app.include_router(stream_router)

try:
    app.mount("/", StaticFiles(directory="../static", html=True), name="static")
except RuntimeError:
    pass
