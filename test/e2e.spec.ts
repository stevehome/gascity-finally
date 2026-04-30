import { test, expect } from '@playwright/test';

const DEFAULT_TICKERS = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA',
  'NVDA', 'META', 'JPM', 'V', 'NFLX',
];

// Tests run serially so state from earlier tests (buy, sell) is visible in later ones.
test.describe.serial('FinAlly E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // 1. 10 default tickers visible; initial portfolio ~$10k
  test('10 default tickers and initial $10k visible', async ({ page }) => {
    for (const ticker of DEFAULT_TICKERS) {
      await expect(page.getByText(ticker, { exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
    // Initial cash balance is $10,000.00
    await expect(page.getByText(/Cash:/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('$10000.00').first()).toBeVisible({ timeout: 5000 });
  });

  // 2. Add PYPL to watchlist
  test('add PYPL to watchlist', async ({ page }) => {
    await page.getByPlaceholder('Add ticker...').fill('PYPL');
    await page.getByRole('button', { name: 'ADD' }).click();
    await expect(page.getByText('PYPL', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  // 3. Remove PYPL from watchlist (added in prior test; state persists in Docker DB)
  test('remove PYPL from watchlist', async ({ page }) => {
    // Wait for PYPL to appear (loaded from DB)
    await expect(page.getByText('PYPL', { exact: true }).first()).toBeVisible({ timeout: 5000 });

    // Click the × button in the PYPL row
    // XPath: find the × button that is a descendant of the cursor-pointer row containing PYPL
    const removeBtn = page.locator(
      'xpath=(//span[normalize-space(.)="PYPL"]/ancestor::div[contains(@class,"cursor-pointer")]//button)[1]'
    );
    await removeBtn.click();

    await expect(page.getByText('PYPL', { exact: true })).not.toBeVisible({ timeout: 5000 });
  });

  // 4. Buy 5 AAPL: cash decreases, position appears
  test('buy 5 AAPL: cash decreases and position appears', async ({ page }) => {
    await page.getByPlaceholder('TICKER').fill('AAPL');
    await page.getByPlaceholder('Qty').fill('5');
    await page.getByRole('button', { name: 'BUY' }).click();

    // Success feedback in the trade bar
    await expect(page.getByText(/BUY 5 AAPL @ \$/).first()).toBeVisible({ timeout: 5000 });

    // AAPL row appears in POSITIONS table
    const positionsSection = page.locator('section').filter({ hasText: 'POSITIONS' }).first();
    await expect(positionsSection.getByText('AAPL').first()).toBeVisible({ timeout: 5000 });

    // Cash is no longer $10,000.00
    await expect(page.getByText('$10000.00').first()).not.toBeVisible({ timeout: 5000 });
  });

  // 5. Sell 2 AAPL
  test('sell 2 AAPL: position quantity drops to 3', async ({ page }) => {
    await page.getByPlaceholder('TICKER').fill('AAPL');
    await page.getByPlaceholder('Qty').fill('2');
    await page.getByRole('button', { name: 'SELL' }).click();

    await expect(page.getByText(/SELL 2 AAPL @ \$/).first()).toBeVisible({ timeout: 5000 });

    // Remaining qty is 3.00
    const positionsSection = page.locator('section').filter({ hasText: 'POSITIONS' }).first();
    await expect(positionsSection.getByText('3.00').first()).toBeVisible({ timeout: 5000 });
  });

  // 6. Heatmap cell visible (AAPL position exists from test 4)
  test('heatmap shows AAPL cell after position exists', async ({ page }) => {
    const heatmapSection = page.locator('section').filter({ hasText: 'HEATMAP' }).first();
    await expect(heatmapSection).toBeVisible({ timeout: 5000 });
    // The Recharts Treemap renders ticker names as SVG <text> elements
    await expect(heatmapSection.locator('text=AAPL').first()).toBeVisible({ timeout: 5000 });
  });

  // 7. PnL chart has data (2 trade-triggered snapshots from tests 4 & 5)
  test('PnL chart renders after two snapshots', async ({ page }) => {
    const portfolioSection = page.locator('section').filter({ hasText: 'PORTFOLIO VALUE' }).first();
    await expect(portfolioSection).toBeVisible({ timeout: 5000 });
    // With ≥2 snapshots the chart renders; "NO HISTORY YET" should not be visible
    await expect(portfolioSection.getByText('NO HISTORY YET')).not.toBeVisible({ timeout: 5000 });
  });

  // 8. Chat returns mock response (LLM_MOCK=true in Docker)
  test('chat returns mock response', async ({ page }) => {
    await page.getByPlaceholder('Ask FinAlly...').fill('What should I buy?');
    await page.getByRole('button', { name: 'SEND' }).click();
    await expect(page.getByText('Mock response').first()).toBeVisible({ timeout: 10000 });
  });

  // 9. SSE price updates arrive within 2s
  test('SSE price updates arrive within 2s', async ({ page }) => {
    await page.goto('/');

    // EventSource fires onopen → status becomes 'Connected'
    await expect(page.getByText('Connected').first()).toBeVisible({ timeout: 2000 });

    // Prices from SSE populate the watchlist; check a dollar-formatted price is visible
    await expect(page.getByText(/^\$\d{2,4}\.\d{2}$/).first()).toBeVisible({ timeout: 2000 });
  });
});
