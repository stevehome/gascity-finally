'use client';

import { Position } from '@/hooks/usePortfolio';

type Props = { positions: Position[] };

export function PositionsTable({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <div className="text-[#e6edf3]/20 text-xs font-mono text-center py-4">NO POSITIONS</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-[#e6edf3]/40 border-b border-[#e6edf3]/10">
            <th className="text-left py-1 pr-4">TICKER</th>
            <th className="text-right py-1 pr-4">QTY</th>
            <th className="text-right py-1 pr-4">AVG COST</th>
            <th className="text-right py-1 pr-4">PRICE</th>
            <th className="text-right py-1">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const pnlColor = p.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400';
            return (
              <tr key={p.ticker} className="border-b border-[#e6edf3]/5">
                <td className="py-1 pr-4 text-[#ecad0a]">{p.ticker}</td>
                <td className="py-1 pr-4 text-right text-[#e6edf3]/80">{p.quantity?.toFixed(2) ?? '—'}</td>
                <td className="py-1 pr-4 text-right text-[#e6edf3]/60">{p.avg_cost != null ? `$${p.avg_cost.toFixed(2)}` : '—'}</td>
                <td className="py-1 pr-4 text-right text-[#e6edf3]/80">{p.current_price != null ? `$${p.current_price.toFixed(2)}` : '—'}</td>
                <td className={`py-1 text-right ${pnlColor}`}>
                  {p.unrealized_pnl != null ? `${p.unrealized_pnl >= 0 ? '+' : ''}${p.unrealized_pnl.toFixed(2)}` : '—'}
                  <span className="ml-1 opacity-60">{p.pnl_pct != null ? `(${p.pnl_pct >= 0 ? '+' : ''}${p.pnl_pct.toFixed(1)}%)` : ''}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
