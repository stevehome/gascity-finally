'use client';

import { useState } from 'react';
import { usePrices } from '@/hooks/usePrices';
import { useWatchlist } from '@/hooks/useWatchlist';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatus';

export default function Home() {
  const { prices, connectionStatus } = usePrices();
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
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onAdd={add}
            onRemove={remove}
          />
        </aside>

        <main className="flex-1 p-4 flex items-center justify-center">
          {selectedTicker && selected ? (
            <div className="text-center">
              <div className="text-[#e6edf3]/40 text-xs font-mono mb-1 tracking-widest">SELECTED</div>
              <div className="text-[#ecad0a] text-2xl font-bold font-mono">{selectedTicker}</div>
              <div className="text-[#e6edf3] text-4xl font-mono mt-2">
                ${selected.price.toFixed(2)}
              </div>
              <div className={`text-sm font-mono mt-2 ${
                selected.direction === 'up' ? 'text-green-400' :
                selected.direction === 'down' ? 'text-red-400' :
                'text-[#e6edf3]/40'
              }`}>
                {selected.direction === 'up' ? '▲' : selected.direction === 'down' ? '▼' : '—'}{' '}
                {(((selected.price - selected.prev_price) / selected.prev_price) * 100).toFixed(3)}%
              </div>
            </div>
          ) : (
            <p className="text-[#e6edf3]/20 text-sm font-mono tracking-widest">
              SELECT A TICKER
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
