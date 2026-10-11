import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api.js';
import { createFakeLocalStorage } from '../test/fakeLocalStorage.js';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

// A response whose body is not valid JSON
const plainTextResponse = (status) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    throw new SyntaxError('Unexpected token');
  },
  text: async () => 'plain text',
});

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createFakeLocalStorage());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ['the "error" field', jsonResponse(400, { error: 'bad input' }), 'bad input'],
    ['the "message" field', jsonResponse(403, { message: 'forbidden' }), 'forbidden'],
    ['a generic message when the JSON has no error', jsonResponse(500, {}), 'HTTP error! status: 500'],
    ['a generic message when the body is not JSON', plainTextResponse(502), 'HTTP error! status: 502'],
  ])('rejects an HTTP error using %s', async (_case, response, expectedMessage) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(apiRequest('/courses')).rejects.toThrow(expectedMessage);
  });

  it('returns null for a 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    const result = await apiRequest('/course/1', { method: 'DELETE' });

    expect(result).toBeNull();
  });

  it('sends the stored token as a Bearer header', async () => {
    vi.stubGlobal('localStorage', createFakeLocalStorage({ token: 'abc123' }));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/courses');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/courses');
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  it('does not send an Authorization header when there is no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/courses');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('removes the JSON Content-Type when the body is FormData', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/image', { method: 'POST', body: new FormData() });

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
});
