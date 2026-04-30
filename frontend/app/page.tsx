'use client';

import { useState } from 'react';
import { usePrices } from '@/hooks/usePrices';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePortfolio } from '@/hooks/usePortfolio';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { MainChart } from '@/components/MainChart';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatus';
import { PositionsTable } from '@/components/PositionsTable';
import { PortfolioHeatmap } from '@/components/PortfolioHeatmap';
import { PnLChart } from '@/components/PnLChart';
import { TradeBar } from '@/components/TradeBar';

export default function Home() {
  const { prices, priceHistory, connectionStatus } = usePrices();
  const { watchlist, add, remove } = useWatchlist();
  const { portfolio, refresh } = usePortfolio();
  const history = usePortfolioHistory();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const selected = selectedTicker ? prices[selectedTicker] : null;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-[#e6edf3]/10 flex-shrink-0">
        <h1 className="text-[#ecad0a] font-mono font-bold tracking-widest text-sm">FinAlly</h1>
        <ConnectionStatusIndicator status={connectionStatus} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 flex-shrink-0 p-2 flex flex-col gap-2 overflow-hidden">
          <WatchlistPanel
            watchlist={watchlist}
            prices={prices}
            priceHistory={priceHistory}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onAdd={add}
            onRemove={remove}
          />
          <TradeBar selectedTicker={selectedTicker} onTradeSuccess={refresh} />
        </aside>

        <main className="flex-1 p-4 overflow-y-auto">
          {selectedTicker && selected ? (
            <MainChart
              ticker={selectedTicker}
              price={selected.price}
              priceHistory={priceHistory[selectedTicker] ?? []}
              direction={selected.direction}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center">
              <p className="text-[#e6edf3]/20 text-sm font-mono tracking-widest">
                SELECT A TICKER
              </p>
            </div>
          )}

          {portfolio && (
            <div className="mt-4 space-y-4">
              <section className="bg-[#1a1a2e] border border-[#e6edf3]/10 rounded p-3">
                <h2 className="text-[#ecad0a] font-mono text-xs font-bold tracking-widest mb-2">PORTFOLIO VALUE</h2>
                <div className="flex gap-6 mb-2 text-xs font-mono">
                  <span className="text-[#e6edf3]/60">Total: <span className="text-[#e6edf3]">${portfolio.total_value.toFixed(2)}</span></span>
                  <span className="text-[#e6edf3]/60">Cash: <span className="text-[#e6edf3]">${portfolio.cash_balance.toFixed(2)}</span></span>
                  <span className="text-[#e6edf3]/60">P&amp;L: <span className={portfolio.total_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{portfolio.total_unrealized_pnl >= 0 ? '+' : ''}{portfolio.total_unrealized_pnl.toFixed(2)}</span></span>
                </div>
                <PnLChart history={history} />
              </section>

              <section className="bg-[#1a1a2e] border border-[#e6edf3]/10 rounded p-3">
                <h2 className="text-[#ecad0a] font-mono text-xs font-bold tracking-widest mb-2">POSITIONS</h2>
                <PositionsTable positions={portfolio.positions} />
              </section>

              <section className="bg-[#1a1a2e] border border-[#e6edf3]/10 rounded p-3">
                <h2 className="text-[#ecad0a] font-mono text-xs font-bold tracking-widest mb-2">HEATMAP</h2>
                <PortfolioHeatmap positions={portfolio.positions} totalValue={portfolio.total_value} />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
