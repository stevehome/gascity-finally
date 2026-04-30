import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { WatchlistItem } from '@/hooks/useWatchlist';
import { PricesState, PriceHistory } from '@/hooks/usePrices';

const item: WatchlistItem = {
  ticker: 'AAPL',
  price: 150.0,
  prev_price: 148.0,
  direction: 'up',
  added_at: '2026-01-01T00:00:00Z',
};

const defaultPrices: PricesState = {
  AAPL: { price: 150.0, prev_price: 148.0, direction: 'up', timestamp: '' },
};

const defaultHistory: PriceHistory = { AAPL: [145, 147, 149, 150] };

function renderPanel(overrides: Partial<React.ComponentProps<typeof WatchlistPanel>> = {}) {
  return render(
    <WatchlistPanel
      watchlist={[item]}
      prices={defaultPrices}
      priceHistory={defaultHistory}
      selectedTicker={null}
      onSelect={jest.fn()}
      onAdd={jest.fn().mockResolvedValue(undefined)}
      onRemove={jest.fn().mockResolvedValue(undefined)}
      {...overrides}
    />
  );
}

describe('WatchlistPanel', () => {
  test('renders ticker and price', () => {
    renderPanel();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  test('applies flash-green class when price goes up', async () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <WatchlistPanel
        watchlist={[item]}
        prices={{ AAPL: { price: 150.0, prev_price: 148.0, direction: 'up', timestamp: '' } }}
        priceHistory={defaultHistory}
        selectedTicker={null}
        onSelect={jest.fn()}
        onAdd={jest.fn().mockResolvedValue(undefined)}
        onRemove={jest.fn().mockResolvedValue(undefined)}
      />
    );

    await act(async () => {
      rerender(
        <WatchlistPanel
          watchlist={[item]}
          prices={{ AAPL: { price: 155.0, prev_price: 150.0, direction: 'up', timestamp: '' } }}
          priceHistory={defaultHistory}
          selectedTicker={null}
          onSelect={jest.fn()}
          onAdd={jest.fn().mockResolvedValue(undefined)}
          onRemove={jest.fn().mockResolvedValue(undefined)}
        />
      );
    });

    const row = screen.getByText('AAPL').closest('div[class*="flex items-center"]') as HTMLElement;
    expect(row?.className).toContain('animate-flash-green');

    act(() => { jest.runAllTimers(); });
    expect(row?.className).not.toContain('animate-flash-green');
    jest.useRealTimers();
  });

  test('applies flash-red class when price goes down', async () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <WatchlistPanel
        watchlist={[item]}
        prices={{ AAPL: { price: 150.0, prev_price: 152.0, direction: 'down', timestamp: '' } }}
        priceHistory={defaultHistory}
        selectedTicker={null}
        onSelect={jest.fn()}
        onAdd={jest.fn().mockResolvedValue(undefined)}
        onRemove={jest.fn().mockResolvedValue(undefined)}
      />
    );

    await act(async () => {
      rerender(
        <WatchlistPanel
          watchlist={[item]}
          prices={{ AAPL: { price: 145.0, prev_price: 150.0, direction: 'down', timestamp: '' } }}
          priceHistory={defaultHistory}
          selectedTicker={null}
          onSelect={jest.fn()}
          onAdd={jest.fn().mockResolvedValue(undefined)}
          onRemove={jest.fn().mockResolvedValue(undefined)}
        />
      );
    });

    const row = screen.getByText('AAPL').closest('div[class*="flex items-center"]') as HTMLElement;
    expect(row?.className).toContain('animate-flash-red');
    jest.useRealTimers();
  });

  test('calls onAdd with uppercased ticker on ADD click', async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    renderPanel({ onAdd });

    const input = screen.getByPlaceholderText('Add ticker...');
    fireEvent.change(input, { target: { value: 'msft' } });
    fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

    expect(onAdd).toHaveBeenCalledWith('MSFT');
  });

  test('calls onAdd when Enter pressed in input', async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    renderPanel({ onAdd });

    const input = screen.getByPlaceholderText('Add ticker...');
    fireEvent.change(input, { target: { value: 'tsla' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith('TSLA');
  });
});
