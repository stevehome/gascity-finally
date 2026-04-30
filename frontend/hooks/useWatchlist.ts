'use client';

import { useCallback, useEffect, useState } from 'react';

export type WatchlistItem = {
  ticker: string;
  price: number;
  prev_price: number;
  direction: 'up' | 'down' | 'flat';
  added_at: string;
};

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const fetchWatchlist = useCallback(async () => {
    const res = await fetch('/api/watchlist');
    const data = await res.json();
    setWatchlist(data);
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const add = useCallback(async (ticker: string) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    });
    const data = await res.json();
    setWatchlist(data);
  }, []);

  const remove = useCallback(async (ticker: string) => {
    const res = await fetch(`/api/watchlist/${ticker}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    setWatchlist(data);
  }, []);

  return { watchlist, add, remove, refresh: fetchWatchlist };
}
