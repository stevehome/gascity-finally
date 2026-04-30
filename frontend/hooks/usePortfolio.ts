'use client';

import { useEffect, useState } from 'react';

export type Position = {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  unrealized_pnl: number;
  pnl_pct: number;
};

export type Portfolio = {
  cash_balance: number;
  total_value: number;
  positions: Position[];
  total_unrealized_pnl: number;
};

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch('/api/portfolio');
        if (res.ok) setPortfolio(await res.json());
      } catch {}
    };

    fetchPortfolio();
    const id = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(id);
  }, []);

  return portfolio;
}
