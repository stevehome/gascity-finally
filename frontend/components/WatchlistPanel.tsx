'use client';

import { useEffect, useRef, useState } from 'react';
import { PricesState } from '@/hooks/usePrices';
import { WatchlistItem } from '@/hooks/useWatchlist';

type Props = {
  watchlist: WatchlistItem[];
  prices: PricesState;
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<void>;
  onRemove: (ticker: string) => Promise<void>;
};

export function WatchlistPanel({ watchlist, prices, selectedTicker, onSelect, onAdd, onRemove }: Props) {
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down'>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const [addInput, setAddInput] = useState('');

  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down'> = {};
    for (const [ticker, entry] of Object.entries(prices)) {
      const prev = prevPricesRef.current[ticker];
      if (prev !== undefined && prev !== entry.price) {
        newFlashes[ticker] = entry.price > prev ? 'up' : 'down';
      }
      prevPricesRef.current[ticker] = entry.price;
    }
    if (Object.keys(newFlashes).length === 0) return;

    setFlashMap(prev => ({ ...prev, ...newFlashes }));
    const timer = setTimeout(() => {
      setFlashMap(prev => {
        const next = { ...prev };
        for (const ticker of Object.keys(newFlashes)) delete next[ticker];
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [prices]);

  const handleAdd = async () => {
    const ticker = addInput.trim().toUpperCase();
    if (!ticker) return;
    await onAdd(ticker);
    setAddInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] border border-[#e6edf3]/10 rounded overflow-hidden">
      <div className="px-3 py-2 border-b border-[#e6edf3]/10 text-xs text-[#ecad0a] font-bold tracking-wider font-mono">
        WATCHLIST
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.map(item => {
          const live = prices[item.ticker];
          const price = live?.price ?? item.price;
          const prevPrice = live?.prev_price ?? item.prev_price;
          const changePct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          const direction = live?.direction ?? item.direction;
          const flash = flashMap[item.ticker];
          const isSelected = selectedTicker === item.ticker;

          return (
            <div
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className={[
                'flex items-center justify-between px-3 py-2 cursor-pointer',
                'border-b border-[#e6edf3]/5 transition-colors duration-150',
                'hover:bg-[#e6edf3]/5',
                isSelected ? 'bg-[#209dd7]/10 border-l-2 border-l-[#209dd7]' : '',
                flash === 'up' ? 'animate-flash-green' : '',
                flash === 'down' ? 'animate-flash-red' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="text-xs font-bold text-[#e6edf3] font-mono">{item.ticker}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#e6edf3] font-mono">${price.toFixed(2)}</span>
                <span className={`text-xs font-mono w-14 text-right ${
                  direction === 'up' ? 'text-green-400' :
                  direction === 'down' ? 'text-red-400' :
                  'text-[#e6edf3]/40'
                }`}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(item.ticker); }}
                  className="text-[#e6edf3]/30 hover:text-red-400 text-sm leading-none transition-colors w-4 text-center"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {watchlist.length === 0 && (
          <p className="text-[#e6edf3]/30 text-xs text-center py-4 font-mono">Empty watchlist</p>
        )}
      </div>

      <div className="p-2 border-t border-[#e6edf3]/10 flex gap-2">
        <input
          type="text"
          value={addInput}
          onChange={e => setAddInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add ticker..."
          className="flex-1 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-xs px-2 py-1 rounded focus:outline-none focus:border-[#ecad0a] font-mono"
        />
        <button
          onClick={handleAdd}
          className="bg-[#ecad0a] text-[#0d1117] text-xs px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity font-mono"
        >
          ADD
        </button>
      </div>
    </div>
  );
}
