import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseService } from './courseService.js';
import { apiRequest } from './api.js';

vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('courseService requests', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  const data = { course_name: 'Go basics' };

  it.each([
    ['getCourses', () => courseService.getCourses(), '/courses', undefined],
    ['getCourseById', () => courseService.getCourseById(3), '/course/3', undefined],
    ['createCourse', () => courseService.createCourse(data), '/course', { method: 'POST', body: JSON.stringify(data) }],
    ['updateCourse', () => courseService.updateCourse(3, data), '/course/3', { method: 'PUT', body: JSON.stringify(data) }],
    ['deleteCourse', () => courseService.deleteCourse(3), '/course/3', { method: 'DELETE' }],
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

  it('propagates the error of the request', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('forbidden'));

    await expect(courseService.deleteCourse(3)).rejects.toThrow('forbidden');
  });
});

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
