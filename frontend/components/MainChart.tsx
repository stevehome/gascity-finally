'use client';

import { useEffect, useRef } from 'react';
import { createChart, AreaSeries, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';

type Props = {
  ticker: string;
  price: number;
  priceHistory: number[];
  direction: 'up' | 'down' | 'flat';
};

const BG = '#0d1117';
const GRID = '#e6edf3' + '10';

export function MainChart({ ticker, price, priceHistory, direction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  const color =
    direction === 'up' ? '#4ade80' :
    direction === 'down' ? '#f87171' :
    '#94a3b8';

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: '#94a3b8',
        fontFamily: 'monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: { horzLine: { visible: true }, vertLine: { visible: true } },
      rightPriceScale: { borderColor: '#e6edf3' + '20' },
      timeScale: {
        borderColor: '#e6edf3' + '20',
        timeVisible: false,
        ticksVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color + '30',
      bottomColor: color + '00',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;
    const data = priceHistory.map((v, i) => ({
      time: (i + 1) as UTCTimestamp,
      value: v,
    }));
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [priceHistory]);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.applyOptions({
      lineColor: color,
      topColor: color + '30',
      bottomColor: color + '00',
    });
  }, [color]);

  const pct = priceHistory.length >= 2
    ? ((priceHistory[priceHistory.length - 1] - priceHistory[0]) / priceHistory[0]) * 100
    : 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1117] rounded overflow-hidden border border-[#e6edf3]/10">
      <div className="flex items-baseline gap-3 px-4 pt-3 pb-2 border-b border-[#e6edf3]/10 flex-shrink-0">
        <span className="text-[#ecad0a] font-bold font-mono text-lg tracking-widest">{ticker}</span>
        <span className="text-[#e6edf3] font-mono text-2xl">${price.toFixed(2)}</span>
        <span className={`text-sm font-mono ml-1 ${
          direction === 'up' ? 'text-green-400' :
          direction === 'down' ? 'text-red-400' :
          'text-[#e6edf3]/40'
        }`}>
          {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—'}{' '}
          {pct >= 0 ? '+' : ''}{pct.toFixed(3)}%
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
