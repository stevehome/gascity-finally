import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PositionsTable } from '@/components/PositionsTable';
import { Position } from '@/hooks/usePortfolio';

const longPosition: Position = {
  ticker: 'AAPL',
  quantity: 10,
  avg_cost: 140.0,
  current_price: 155.0,
  unrealized_pnl: 150.0,
  pnl_pct: 10.71,
};

const shortPosition: Position = {
  ticker: 'NVDA',
  quantity: 5,
  avg_cost: 200.0,
  current_price: 180.0,
  unrealized_pnl: -100.0,
  pnl_pct: -10.0,
};

describe('PositionsTable', () => {
  test('shows NO POSITIONS when positions array is empty', () => {
    render(<PositionsTable positions={[]} />);
    expect(screen.getByText('NO POSITIONS')).toBeInTheDocument();
  });

  test('renders ticker and values for a position', () => {
    render(<PositionsTable positions={[longPosition]} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('$140.00')).toBeInTheDocument();
    expect(screen.getByText('$155.00')).toBeInTheDocument();
  });

  test('pnl cell is green for positive unrealized_pnl', () => {
    render(<PositionsTable positions={[longPosition]} />);
    const pnlCell = screen.getByText((content) => content.includes('+150.00'));
    expect(pnlCell).toHaveClass('text-green-400');
  });

  test('pnl cell is red for negative unrealized_pnl', () => {
    render(<PositionsTable positions={[shortPosition]} />);
    const pnlCell = screen.getByText((content) => content.includes('-100.00'));
    expect(pnlCell).toHaveClass('text-red-400');
  });

  test('renders multiple positions', () => {
    render(<PositionsTable positions={[longPosition, shortPosition]} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('NVDA')).toBeInTheDocument();
  });
});
