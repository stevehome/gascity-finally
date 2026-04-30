'use client';

import { useEffect, useRef, useState } from 'react';

export type PriceEntry = {
  price: number;
  prev_price: number;
  direction: 'up' | 'down' | 'flat';
  timestamp: string;
};

export type PricesState = Record<string, PriceEntry>;
export type PriceHistory = Record<string, number[]>;

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export function usePrices() {
  const [prices, setPrices] = useState<PricesState>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream/prices');
    esRef.current = es;
    setConnectionStatus('reconnecting');

    es.onopen = () => setConnectionStatus('connected');

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrices(prev => ({
        ...prev,
        [data.ticker]: {
          price: data.price,
          prev_price: data.prev_price,
          direction: data.direction,
          timestamp: data.timestamp,
        },
      }));
      setPriceHistory(prev => {
        const hist = prev[data.ticker] ?? [];
        const next = [...hist, data.price as number];
        return { ...prev, [data.ticker]: next.length > 100 ? next.slice(-100) : next };
      });
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('reconnecting');
      }
    };

    return () => {
      es.close();
    };
  }, []);

  return { prices, priceHistory, connectionStatus };
}
