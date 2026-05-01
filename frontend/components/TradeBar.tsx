'use client';

import { useEffect, useState } from 'react';

type Props = {
  selectedTicker: string | null;
  onTradeSuccess: () => void;
};

export function TradeBar({ selectedTicker, onTradeSuccess }: Props) {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [inFlight, setInFlight] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (selectedTicker) setTicker(selectedTicker);
  }, [selectedTicker]);

  const submit = async (side: 'buy' | 'sell') => {
    const t = ticker.trim().toUpperCase();
    const q = parseFloat(quantity);
    if (!t || !q || q <= 0) {
      setMessage({ text: 'Enter a valid ticker and quantity', ok: false });
      return;
    }
    setInFlight(true);
    setMessage(null);
    try {
      const res = await fetch('/api/portfolio/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t, quantity: q, side }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `${side.toUpperCase()} ${q} ${t} @ $${data.trade.price.toFixed(2)}`, ok: true });
        setQuantity('');
        onTradeSuccess();
      } else {
        setMessage({ text: data.detail ?? 'Trade failed', ok: false });
      }
    } catch {
      setMessage({ text: 'Network error', ok: false });
    } finally {
      setInFlight(false);
    }
  };

  return (
    <div className="bg-[#1a1a2e] border border-[#e6edf3]/10 rounded px-2 py-1.5">
      <div className="flex gap-1 items-center">
        <span className="text-[#ecad0a] font-mono text-[10px] font-bold tracking-widest flex-shrink-0">TRADE</span>
        <input
          type="text"
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          disabled={inFlight}
          className="w-14 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-[10px] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#ecad0a] font-mono disabled:opacity-50"
        />
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Qty"
          min="0"
          disabled={inFlight}
          className="w-12 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-[10px] px-1.5 py-0.5 rounded focus:outline-none focus:border-[#ecad0a] font-mono disabled:opacity-50"
        />
        <button
          onClick={() => submit('buy')}
          disabled={inFlight}
          className="bg-[#209dd7] text-white text-[10px] px-2 py-0.5 rounded font-bold hover:opacity-80 transition-opacity font-mono disabled:opacity-40 flex-shrink-0"
        >
          BUY
        </button>
        <button
          onClick={() => submit('sell')}
          disabled={inFlight}
          className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold hover:opacity-80 transition-opacity font-mono disabled:opacity-40 flex-shrink-0"
        >
          SELL
        </button>
        {message && (
          <span className={`text-xs font-mono truncate ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
