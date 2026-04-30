'use client';

import { useEffect, useRef, useState } from 'react';

export type PriceEntry = {
  price: number;
  prev_price: number;
  direction: 'up' | 'down' | 'flat';
  timestamp: string;
};

export type PricesState = Record<string, PriceEntry>;

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export function usePrices() {
  const [prices, setPrices] = useState<PricesState>({});
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

  return { prices, connectionStatus };
}
