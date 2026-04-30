'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryPoint } from '@/hooks/usePortfolioHistory';

type Props = { history: HistoryPoint[] };

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PnLChart({ history }: Props) {
  if (history.length < 2) {
    return <div className="text-[#e6edf3]/20 text-xs font-mono text-center py-4">NO HISTORY YET</div>;
  }

  const data = history.map((h) => ({
    time: formatTime(h.recorded_at),
    value: h.total_value,
  }));

  const baseline = data[0].value;
  const last = data[data.length - 1].value;
  const lineColor = last >= baseline ? '#4ade80' : '#f87171';

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="time" tick={{ fill: '#e6edf355', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={['auto', 'auto']} tick={{ fill: '#e6edf355', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={48} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid #e6edf320', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}
          labelStyle={{ color: '#e6edf360' }}
          itemStyle={{ color: lineColor }}
          formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Total Value']}
        />
        <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
