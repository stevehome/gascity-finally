import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ChatPanel } from '@/components/ChatPanel';

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

function mockFetchOk(body: object) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  } as Response);
}

function mockFetchError(detail: string) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    json: async () => ({ detail }),
  } as Response);
}

describe('ChatPanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Enter key sends message and shows user bubble', async () => {
    mockFetchOk({ message: 'OK', trades_executed: [], watchlist_changes_executed: [], errors: [] });
    render(<ChatPanel onActionsExecuted={jest.fn()} />);

    const input = screen.getByPlaceholderText('Ask FinAlly...');
    fireEvent.change(input, { target: { value: 'buy AAPL' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(screen.getByText('buy AAPL')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ message: 'buy AAPL' }),
    }));
  });

  test('shows loading indicator while awaiting response', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = jest.fn().mockReturnValueOnce(
      new Promise(r => { resolve = r; })
    );

    render(<ChatPanel onActionsExecuted={jest.fn()} />);
    const input = screen.getByPlaceholderText('Ask FinAlly...');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const dots = screen.getAllByText((_, el) => el?.className?.includes('animate-bounce') ?? false);
    expect(dots.length).toBeGreaterThan(0);

    await act(async () => {
      resolve({
        ok: true,
        json: async () => ({ message: 'Hi!', trades_executed: [], watchlist_changes_executed: [], errors: [] }),
      });
    });
  });

  test('shows assistant response after successful fetch', async () => {
    mockFetchOk({ message: 'Hello from AI', trades_executed: [], watchlist_changes_executed: [], errors: [] });
    render(<ChatPanel onActionsExecuted={jest.fn()} />);

    const input = screen.getByPlaceholderText('Ask FinAlly...');
    fireEvent.change(input, { target: { value: 'hi' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => expect(screen.getByText('Hello from AI')).toBeInTheDocument());
  });

  test('renders trade chips for executed trades', async () => {
    mockFetchOk({
      message: 'Done',
      trades_executed: [{ ticker: 'AAPL', side: 'buy', quantity: 5, price: 150.0 }],
      watchlist_changes_executed: [],
      errors: [],
    });
    render(<ChatPanel onActionsExecuted={jest.fn()} />);

    const input = screen.getByPlaceholderText('Ask FinAlly...');
    fireEvent.change(input, { target: { value: 'buy 5 AAPL' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => expect(screen.getByText(/Bought 5 AAPL/)).toBeInTheDocument());
  });

  test('calls onActionsExecuted when trades are returned', async () => {
    mockFetchOk({
      message: 'Bought',
      trades_executed: [{ ticker: 'TSLA', side: 'buy', quantity: 2, price: 200.0 }],
      watchlist_changes_executed: [],
      errors: [],
    });
    const onActionsExecuted = jest.fn();
    render(<ChatPanel onActionsExecuted={onActionsExecuted} />);

    const input = screen.getByPlaceholderText('Ask FinAlly...');
    fireEvent.change(input, { target: { value: 'buy TSLA' } });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => expect(onActionsExecuted).toHaveBeenCalled());
  });
});
