import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateAverage,
  countByStars,
  getCourseRatingSummary,
  getRatingLabel,
  hasEnoughRatings,
  isValidRating,
  summarizeRatings,
} from './ratingService.js';
import subscriptionService from './subscriptionService.js';

// The API is replaced by a double: no test touches the network.
vi.mock('./subscriptionService.js', () => ({
  default: { getSubscriptionsByCourseId: vi.fn() },
}));

describe('isValidRating', () => {
  it.each([
    ['the lowest rating', 1],
    ['a decimal rating', 3.5],
    ['the highest rating', 5],
  ])('accepts %s', (_case, rating) => {
    expect(isValidRating(rating)).toBe(true);
  });

  it.each([
    ['zero (not rated yet)', 0],
    ['a negative number', -1],
    ['a number over the maximum', 6],
    ['NaN', NaN],
    ['a numeric string', '4'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_case, rating) => {
    expect(isValidRating(rating)).toBe(false);
  });
});

describe('calculateAverage', () => {
  it.each([
    ['two ratings', [5, 4], 4.5],
    ['a rating below the average', [1, 2], 1.5],
    ['an average rounded to one decimal', [5, 4, 4], 4.3],
    ['ratings mixed with invalid values, which are ignored', [4, 0, 5, 'x', 9], 4.5],
  ])('averages %s', (_case, ratings, expected) => {
    expect(calculateAverage(ratings)).toBe(expected);
  });

  it.each([
    ['an empty list', []],
    ['only unrated subscriptions', [0, 0]],
  ])('returns null for %s', (_case, ratings) => {
    expect(calculateAverage(ratings)).toBeNull();
  });
});

describe('countByStars', () => {
  it('counts every valid rating under its star level and ignores the rest', () => {
    const counts = countByStars([1, 2, 2, 5, 0, 7, 4.6]);

    expect(counts).toEqual({ 1: 1, 2: 2, 3: 0, 4: 0, 5: 2 });
  });
});

describe('getRatingLabel', () => {
  it.each([
    [null, 'Sin valoraciones'],
    [5, 'Excelente'],
    [4.5, 'Excelente'],
    [4.4, 'Muy bueno'],
    [4, 'Muy bueno'],
    [3.9, 'Bueno'],
    [3, 'Bueno'],
    [2.9, 'Regular'],
    [2, 'Regular'],
    [1.9, 'Malo'],
    [1, 'Malo'],
  ])('labels an average of %s as "%s"', (average, expected) => {
    expect(getRatingLabel(average)).toBe(expected);
  });
});

describe('hasEnoughRatings', () => {
  it.each([
    ['exactly the minimum', [5, 4, 3], undefined, true],
    ['one less than the minimum', [5, 4], undefined, false],
    ['unrated subscriptions, which do not count', [5, 4, 0], undefined, false],
    ['a custom minimum', [5], 1, true],
  ])('with %s', (_case, ratings, minimum, expected) => {
    expect(hasEnoughRatings(ratings, minimum)).toBe(expected);
  });
});

describe('summarizeRatings', () => {
  it('builds the full summary from the valid ratings only', () => {
    const summary = summarizeRatings([5, 4, 0, 3]);

    expect(summary).toEqual({
      average: 4,
      total: 3,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
      label: 'Muy bueno',
      visible: true,
    });
  });

  it('is empty and not visible when nobody rated yet', () => {
    const summary = summarizeRatings([0, 0]);

    expect(summary.average).toBeNull();
    expect(summary.total).toBe(0);
    expect(summary.label).toBe('Sin valoraciones');
    expect(summary.visible).toBe(false);
  });
});

describe('getCourseRatingSummary', () => {
  afterEach(() => {
    vi.mocked(subscriptionService.getSubscriptionsByCourseId).mockReset();
  });

  it('asks for the subscriptions of the course and summarizes their ratings', async () => {
    vi.mocked(subscriptionService.getSubscriptionsByCourseId).mockResolvedValue([
      { individual_rating: 5 },
      { individual_rating: 3 },
      { individual_rating: 0 },
      { individual_rating: 4 },
    ]);

    const summary = await getCourseRatingSummary(7);

    expect(subscriptionService.getSubscriptionsByCourseId).toHaveBeenCalledTimes(1);
    expect(subscriptionService.getSubscriptionsByCourseId).toHaveBeenCalledWith(7);
    expect(summary.average).toBe(4);
    expect(summary.total).toBe(3);
  });

  it('returns an empty summary when the course has no subscriptions', async () => {
    vi.mocked(subscriptionService.getSubscriptionsByCourseId).mockResolvedValue(null);

    const summary = await getCourseRatingSummary(7);

    expect(summary.average).toBeNull();
    expect(summary.label).toBe('Sin valoraciones');
  });

  it('propagates the error when the request fails', async () => {
    vi.mocked(subscriptionService.getSubscriptionsByCourseId).mockRejectedValue(new Error('network down'));

    await expect(getCourseRatingSummary(7)).rejects.toThrow('network down');
  });
});
