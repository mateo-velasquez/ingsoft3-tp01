import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseService } from './courseService.js';
import { apiRequest } from './api.js';

vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('courseService.searchCourses', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it.each([
    ['no categories', 'go', [], '/course/search?q=go'],
    ['one category', 'go', [3], '/course/search?q=go&categories=3'],
    ['several categories', 'go', [1, 2, 3], '/course/search?q=go&categories=1,2,3'],
    ['a query with special characters', 'a b&c', [], '/course/search?q=a%20b%26c'],
  ])('builds the right URL with %s', async (_case, query, categories, expectedUrl) => {
    vi.mocked(apiRequest).mockResolvedValue([]);

    await courseService.searchCourses(query, categories);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(expectedUrl);
  });
});
