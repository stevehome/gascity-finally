'use client';

const W = 40;
const H = 24;

export function Sparkline({ priceHistory }: { priceHistory: number[] }) {
  if (priceHistory.length < 2) {
    return <svg width={W} height={H} />;
  }

  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  const range = max - min || 1;
  const n = priceHistory.length;

  const pts = priceHistory.map((p, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - ((p - min) / range) * (H - 2) - 1;
    return [x, y] as [number, number];
  });

  const linePts = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath =
    `M${pts[0][0]},${H} ` +
    pts.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${pts[n - 1][0]},${H} Z`;

  const isUp = priceHistory[n - 1] >= priceHistory[0];
  const color = isUp ? '#4ade80' : '#f87171';

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <path d={areaPath} fill={color} fillOpacity={0.15} />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
