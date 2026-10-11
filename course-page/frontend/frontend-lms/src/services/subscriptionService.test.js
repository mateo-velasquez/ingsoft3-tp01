import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscriptionService } from './subscriptionService.js';
import { apiRequest } from './api.js';

vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('subscriptionService.updateRating', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it.each([
    ['a number', 4, 4],
    ['a numeric string', '4.5', 4.5],
  ])('sends the rating as a number when it receives %s', async (_case, input, expected) => {
    vi.mocked(apiRequest).mockResolvedValue({});

    await subscriptionService.updateRating(9, input);

    const [endpoint, options] = vi.mocked(apiRequest).mock.calls[0];
    expect(endpoint).toBe('/course/subscription/rating/9');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ id: 9, individual_rating: expected });
  });
});
