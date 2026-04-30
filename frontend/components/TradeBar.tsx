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
    <div className="bg-[#1a1a2e] border border-[#e6edf3]/10 rounded p-3">
      <h2 className="text-[#ecad0a] font-mono text-xs font-bold tracking-widest mb-2">TRADE</h2>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          disabled={inFlight}
          className="w-24 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-xs px-2 py-1 rounded focus:outline-none focus:border-[#ecad0a] font-mono disabled:opacity-50"
        />
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Qty"
          min="0"
          disabled={inFlight}
          className="w-20 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-xs px-2 py-1 rounded focus:outline-none focus:border-[#ecad0a] font-mono disabled:opacity-50"
        />
        <button
          onClick={() => submit('buy')}
          disabled={inFlight}
          className="bg-[#209dd7] text-white text-xs px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity font-mono disabled:opacity-40"
        >
          BUY
        </button>
        <button
          onClick={() => submit('sell')}
          disabled={inFlight}
          className="bg-red-600 text-white text-xs px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity font-mono disabled:opacity-40"
        >
          SELL
        </button>
        {message && (
          <span className={`text-xs font-mono ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
