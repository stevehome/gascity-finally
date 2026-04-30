'use client';

import { useState } from 'react';
import { usePrices } from '@/hooks/usePrices';
import { useWatchlist } from '@/hooks/useWatchlist';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { MainChart } from '@/components/MainChart';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatus';

export default function Home() {
  const { prices, priceHistory, connectionStatus } = usePrices();
  const { watchlist, add, remove } = useWatchlist();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const selected = selectedTicker ? prices[selectedTicker] : null;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-[#e6edf3]/10 flex-shrink-0">
        <h1 className="text-[#ecad0a] font-mono font-bold tracking-widest text-sm">FinAlly</h1>
        <ConnectionStatusIndicator status={connectionStatus} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 flex-shrink-0 p-2 overflow-hidden">
          <WatchlistPanel
            watchlist={watchlist}
            prices={prices}
            priceHistory={priceHistory}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onAdd={add}
            onRemove={remove}
          />
        </aside>

        <main className="flex-1 p-4 overflow-hidden">
          {selectedTicker && selected ? (
            <MainChart
              ticker={selectedTicker}
              price={selected.price}
              priceHistory={priceHistory[selectedTicker] ?? []}
              direction={selected.direction}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[#e6edf3]/20 text-sm font-mono tracking-widest">
                SELECT A TICKER
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
