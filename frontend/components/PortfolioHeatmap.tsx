'use client';

import { Treemap, ResponsiveContainer } from 'recharts';
import { Position } from '@/hooks/usePortfolio';

type Props = { positions: Position[]; totalValue: number };

type HeatmapEntry = {
  name: string;
  size: number;
  pnl_pct: number;
};

function colorForPnl(pnl_pct: number): string {
  if (pnl_pct > 5) return '#16a34a';
  if (pnl_pct > 2) return '#22c55e';
  if (pnl_pct > 0) return '#4ade80';
  if (pnl_pct > -2) return '#f87171';
  if (pnl_pct > -5) return '#ef4444';
  return '#dc2626';
}

function CustomContent(props: any) {
  const { x, y, width, height, name, pnl_pct } = props;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={colorForPnl(pnl_pct)} stroke="#1a1a2e" strokeWidth={2} rx={2} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontFamily="monospace" fontWeight="bold">
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="#fff" fontSize={9} fontFamily="monospace" opacity={0.8}>
        {pnl_pct >= 0 ? '+' : ''}{pnl_pct.toFixed(1)}%
      </text>
    </g>
  );
}

export function PortfolioHeatmap({ positions, totalValue }: Props) {
  if (positions.length === 0) {
    return <div className="text-[#e6edf3]/20 text-xs font-mono text-center py-4">NO POSITIONS</div>;
  }

  const data: HeatmapEntry[] = positions.map((p) => ({
    name: p.ticker,
    size: (p.current_price * p.quantity) / totalValue,
    pnl_pct: p.pnl_pct,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <Treemap data={data} dataKey="size" content={<CustomContent />} isAnimationActive={false} />
    </ResponsiveContainer>
  );
}
