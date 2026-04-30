'use client';

import { useEffect, useRef, useState } from 'react';

type Trade = {
  ticker: string;
  side: string;
  quantity: number;
  price: number;
};

type WatchlistChange = {
  ticker: string;
  action: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  trades?: Trade[];
  watchlist_changes?: WatchlistChange[];
  errors?: string[];
};

type Props = {
  onActionsExecuted: () => void;
};

export function ChatPanel({ onActionsExecuted }: Props) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setApiError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Chat failed');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        trades: data.trades_executed,
        watchlist_changes: data.watchlist_changes_executed,
        errors: data.errors,
      }]);

      if (data.trades_executed?.length || data.watchlist_changes_executed?.length) {
        onActionsExecuted();
      }
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-shrink-0 flex border-l border-[#e6edf3]/10 transition-all duration-200 ${open ? 'w-72' : 'w-8'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Collapse chat' : 'Expand chat'}
        className="flex-shrink-0 w-8 flex items-center justify-center bg-[#1a1a2e] hover:bg-[#e6edf3]/5 border-r border-[#e6edf3]/10 transition-colors"
      >
        <span
          className="text-[#ecad0a] font-mono text-xs font-bold select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {open ? '▼ CHAT' : '▲ CHAT'}
        </span>
      </button>

      {open && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-[#e6edf3]/20 text-xs text-center py-4 font-mono">
                Ask FinAlly anything...
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[90%] px-2 py-1.5 rounded text-xs font-mono leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#209dd7]/20 text-[#e6edf3] border border-[#209dd7]/30'
                      : 'bg-[#e6edf3]/5 text-[#e6edf3] border border-[#e6edf3]/10'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <>
                    {msg.trades?.map((t, j) => (
                      <div key={`t-${j}`} className="mt-0.5 px-2 py-0.5 rounded text-xs font-mono bg-green-900/30 text-green-400 border border-green-700/30">
                        {t.side === 'buy' ? 'Bought' : 'Sold'} {t.quantity} {t.ticker} @ ${t.price.toFixed(2)}
                      </div>
                    ))}
                    {msg.watchlist_changes?.map((w, j) => (
                      <div key={`w-${j}`} className="mt-0.5 px-2 py-0.5 rounded text-xs font-mono bg-[#209dd7]/20 text-[#209dd7] border border-[#209dd7]/30">
                        {w.action === 'add' ? 'Added' : 'Removed'} {w.ticker} {w.action === 'add' ? 'to' : 'from'} watchlist
                      </div>
                    ))}
                    {msg.errors?.filter(Boolean).map((err, j) => (
                      <div key={`e-${j}`} className="mt-0.5 px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-700/30">
                        {err}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="px-2 py-1.5 rounded text-xs font-mono bg-[#e6edf3]/5 border border-[#e6edf3]/10">
                  <span className="inline-block animate-bounce text-[#e6edf3]/60" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="inline-block animate-bounce text-[#e6edf3]/60" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="inline-block animate-bounce text-[#e6edf3]/60" style={{ animationDelay: '300ms' }}>●</span>
                </div>
              </div>
            )}
            {apiError && (
              <p className="text-xs text-red-400 font-mono text-center">{apiError}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-[#e6edf3]/10 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Ask FinAlly..."
              disabled={loading}
              className="flex-1 min-w-0 bg-[#0d1117] border border-[#e6edf3]/20 text-[#e6edf3] text-xs px-2 py-1 rounded focus:outline-none focus:border-[#ecad0a] font-mono disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 bg-[#ecad0a] text-[#0d1117] text-xs px-3 py-1 rounded font-bold hover:opacity-80 transition-opacity font-mono disabled:opacity-40"
            >
              SEND
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
