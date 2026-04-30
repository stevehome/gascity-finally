'use client';

import { ConnectionStatus } from '@/hooks/usePrices';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  reconnecting: { color: 'bg-yellow-500', label: 'Reconnecting' },
  disconnected: { color: 'bg-red-500', label: 'Disconnected' },
};

export function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const { color, label } = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-2 text-xs text-[#e6edf3]/70 font-mono">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
