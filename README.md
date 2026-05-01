# FinAlly

AI-powered trading workstation — stream live simulated market data, manage a portfolio, and chat with an LLM assistant that can execute trades and manage your watchlist on your behalf.

## Features

- **Live price stream** — 10 tickers updated every 500ms via GBM simulator with SSE
- **Watchlist** — add/remove tickers, sparkline mini-charts, flash animations on price change
- **Portfolio** — buy/sell shares, positions table, P&L heatmap, P&L history chart
- **AI chat** — ask questions or give instructions; the LLM can trade and manage your watchlist
- **Persistent data** — SQLite volume survives container restarts

## Running the App

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- An LLM API key (see [AI Chat Setup](#ai-chat-setup) below)

### Start

```bash
# macOS / Linux
./scripts/start_mac.sh

# Windows (PowerShell)
./scripts/start_windows.ps1
```

Open **http://localhost:8000**

### Stop

```bash
./scripts/stop_mac.sh        # macOS / Linux
./scripts/stop_windows.ps1   # Windows
```

Data is preserved in the `finally-data` Docker volume across restarts.

### First-time build

The start script builds the image automatically if it doesn't exist. To force a rebuild:

```bash
./scripts/start_mac.sh --build
```

## Configuration

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```env
GROQ_API_KEY=gsk_...          # Primary LLM (free at console.groq.com)
OPENROUTER_API_KEY=sk-or-...  # Fallback LLM (openrouter.ai)
LLM_MOCK=false                # Set true to disable real LLM calls
```

## AI Chat Setup

The chat panel uses `meta-llama/llama-3.1-8b-instruct` via **Groq** (preferred) or **OpenRouter** (fallback).

**Groq** (recommended — free tier, fast):
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Add `GROQ_API_KEY=gsk_...` to `.env`

**OpenRouter** (fallback):
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key
3. Add `OPENROUTER_API_KEY=sk-or-...` to `.env`
4. In your workspace routing settings, clear the model pattern filter (leave empty)

Without a key, set `LLM_MOCK=true` to get a dummy response and still test trade/watchlist actions.

## Architecture

```
finally/
├── backend/          FastAPI + uv (Python 3.12)
│   ├── api/          REST endpoints: portfolio, watchlist, chat, SSE stream
│   ├── market/       GBM price simulator + in-memory price cache
│   └── db/           SQLite schema + seed data
├── frontend/         Next.js 14 + TypeScript + Tailwind (static export)
│   ├── components/   WatchlistPanel, MainChart, Sparkline, TradeBar, ChatPanel, ...
│   └── hooks/        usePrices (SSE), useWatchlist, usePortfolio, usePortfolioHistory
├── scripts/          start/stop for macOS and Windows
└── test/             Playwright E2E tests
```

The backend serves the compiled frontend as static files — a single container on port 8000.

## Running Tests

**Backend (pytest)**
```bash
cd backend
uv run pytest -v
```

**Frontend (Jest)**
```bash
cd frontend
npm test
```

**End-to-end (Playwright in Docker)**
```bash
docker compose -f test/docker-compose.test.yml up --build --exit-code-from playwright
```

## Making Enhancements

This app was built using [Gas City](https://github.com/stevehome/gascity-gastown) — an AI agent orchestration framework. Enhancements follow the same pattern used to build it.

The build plan lives at:
```
gastown/planning/FINALLY_PLAN.md
```

### Adding a new step

1. Add a row to the status table in `FINALLY_PLAN.md`
2. Write a step section with a `gc sling` command describing what to build
3. From the gastown city root, dispatch the work to the portfolio rig:

```bash
gc sling claude "Your instructions here..." --rig portfolio
```

4. Monitor progress:

```bash
bd ready          # see queued work
bd show <id>      # check a specific item
```

5. Once done, rebuild the Docker image and test:

```bash
cd ~/projects/portfolio/finally
./scripts/start_mac.sh --build
```

### Example enhancement

To add a news feed panel:

```bash
gc sling claude "Add a NewsPanel component to ~/projects/portfolio/finally/frontend/. Fetch headlines from /api/news (create this endpoint). Display latest 5 headlines per selected ticker. Poll every 60s." --rig portfolio
```

The agent writes the code, runs the build, and closes the work item when done.
