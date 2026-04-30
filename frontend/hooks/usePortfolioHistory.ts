'use client';

import { useEffect, useState } from 'react';

export type HistoryPoint = {
  id: string;
  total_value: number;
  recorded_at: string;
};

export function usePortfolioHistory() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/portfolio/history');
        if (res.ok) setHistory(await res.json());
      } catch {}
    };

    fetchHistory();
    const id = setInterval(fetchHistory, 30000);
    return () => clearInterval(id);
  }, []);

  return history;
}
