from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.health import router as health_router
from db.schema import init_db

load_dotenv("../.env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(health_router)

try:
    app.mount("/", StaticFiles(directory="../static", html=True), name="static")
except RuntimeError:
    pass
