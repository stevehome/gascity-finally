import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from market import cache

router = APIRouter()


@router.get("/api/stream/prices")
async def stream_prices():
    async def event_generator():
        while True:
            prices = cache.get_all()
            for ticker_data in prices.values():
                data = json.dumps(ticker_data)
                yield f"data: {data}\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
