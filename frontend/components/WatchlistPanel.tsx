'use client';

import { useEffect, useRef, useState } from 'react';
import { PriceHistory, PricesState } from '@/hooks/usePrices';
import { WatchlistItem } from '@/hooks/useWatchlist';
import { Sparkline } from '@/components/Sparkline';

type Props = {
  watchlist: WatchlistItem[];
  prices: PricesState;
  priceHistory: PriceHistory;
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<void>;
  onRemove: (ticker: string) => Promise<void>;
};

export function WatchlistPanel({ watchlist, prices, priceHistory, selectedTicker, onSelect, onAdd, onRemove }: Props) {
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
              style={{ display: 'grid', gridTemplateColumns: '60px 40px 46px 30px', gap: '4px', alignItems: 'center' }}
              className={[
                'px-2 py-1 cursor-pointer',
                'border-b border-[#e6edf3]/5 transition-colors duration-150',
                'hover:bg-[#e6edf3]/5',
                isSelected ? 'bg-[#209dd7]/10 border-l-2 border-l-[#209dd7]' : '',
                flash === 'up' ? 'animate-flash-green' : '',
                flash === 'down' ? 'animate-flash-red' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-[#e6edf3] font-mono truncate">{item.ticker}</span>
                <span className={`text-[10px] font-mono ${
                  direction === 'up' ? 'text-green-400' :
                  direction === 'down' ? 'text-red-400' :
                  'text-[#e6edf3]/40'
                }`}>
                  {changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                </span>
              </div>
              <Sparkline priceHistory={priceHistory[item.ticker] ?? []} />
              <span className="text-xs text-[#e6edf3] font-mono text-right">{price != null ? `$${price.toFixed(2)}` : '—'}</span>
              <button
                onClick={e => { e.stopPropagation(); onRemove(item.ticker); }}
                className="ml-1 text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
              >
                DEL
              </button>
            </div>
          );
        })}
        {watchlist.length === 0 && (
          <p className="text-[#e6edf3]/30 text-xs text-center py-4 font-mono">Empty watchlist</p>
        )}
      </div>

      <div className="px-2 py-1.5 border-t border-[#e6edf3]/10 flex gap-1 items-center">
        <span className="font-mono text-[10px] font-bold tracking-widest flex-shrink-0 invisible">TRADE</span>
        <input
          type="text"
          value={addInput}
          onChange={e => setAddInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="add ticker"
          className="flex-1 min-w-0 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-[10px] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#ecad0a] font-mono"
        />
        <button
          onClick={handleAdd}
          className="bg-[#ecad0a] text-[#0d1117] text-[10px] px-2 py-0.5 rounded font-bold hover:opacity-80 transition-opacity font-mono flex-shrink-0"
        >
          ADD
        </button>
      </div>
    </div>
  );
}
