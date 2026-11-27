import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './ApiStatus';

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('ApiStatus', () => {
  it('shows the loading state, then the available state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { data: { status: 'ok', database: 'ok' } }));
    renderStatus();
    expect(screen.getByText('Checking the service…')).toBeInTheDocument();
    expect(await screen.findByText('Service available.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/health/ready',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('shows the error state with a reference and recovers on retry', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(503, { data: { status: 'unavailable' } }, { 'X-Request-Id': 'req-123' }))
      .mockResolvedValueOnce(json(200, { data: { status: 'ok', database: 'ok' } }));
    renderStatus();
    expect(await screen.findByText('Service unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Reference: req-123')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Service available.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('explains a network failure in plain words', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderStatus();
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();
  });
});
