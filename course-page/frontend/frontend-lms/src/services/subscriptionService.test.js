import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscriptionService } from './subscriptionService.js';
import { apiRequest } from './api.js';

vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('subscriptionService requests', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  const data = { id_course: 4, id_user: 5 };

  it.each([
    ['getSubscriptions', () => subscriptionService.getSubscriptions(), '/subscriptions', undefined],
    ['getSubscriptionById', () => subscriptionService.getSubscriptionById(2), '/subscription/2', undefined],
    ['getSubscriptionsByUserId', () => subscriptionService.getSubscriptionsByUserId(5), '/user/subscriptions/5', undefined],
    ['getSubscriptionsByCourseId', () => subscriptionService.getSubscriptionsByCourseId(4), '/course/subscriptions/4', undefined],
    ['createSubscription', () => subscriptionService.createSubscription(data), '/user/subscription', { method: 'POST', body: JSON.stringify(data) }],
  ])('%s calls the right endpoint', async (_name, call, endpoint, options) => {
    vi.mocked(apiRequest).mockResolvedValue({});

    await call();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    if (options) {
      expect(apiRequest).toHaveBeenCalledWith(endpoint, options);
    } else {
      expect(apiRequest).toHaveBeenCalledWith(endpoint);
    }
  });

  it('updateComment sends the id and the comment', async () => {
    vi.mocked(apiRequest).mockResolvedValue({});

    await subscriptionService.updateComment(7, 'nice course');

    const [endpoint, options] = vi.mocked(apiRequest).mock.calls[0];
    expect(endpoint).toBe('/course/subscription/comment/7');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ id: 7, comment: 'nice course' });
  });
});

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
