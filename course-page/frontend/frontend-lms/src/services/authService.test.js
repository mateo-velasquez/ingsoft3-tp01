import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './authService.js';
import { apiRequest } from './api.js';
import { createFakeLocalStorage } from '../test/fakeLocalStorage.js';

// The HTTP client is replaced by a double: no test touches the network.
vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('authService', () => {
  let storage;

  beforeEach(() => {
    storage = createFakeLocalStorage();
    vi.stubGlobal('localStorage', storage);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(apiRequest).mockReset();
  });

  describe('getCurrentUser', () => {
    it.each([
      ['nothing stored', undefined],
      ['the string "undefined"', 'undefined'],
      ['the string "null"', 'null'],
      ['a broken JSON', '{not valid json'],
    ])('returns null when there is %s', (_case, stored) => {
      if (stored !== undefined) storage.setItem('user', stored);

      expect(authService.getCurrentUser()).toBeNull();
    });

    it('removes the stored user when its JSON is broken', () => {
      storage.setItem('user', '{not valid json');

      authService.getCurrentUser();

      expect(storage.getItem('user')).toBeNull();
    });

    it('returns the parsed user when the JSON is valid', () => {
      storage.setItem('user', JSON.stringify({ id: 1, accesslevel: 'admin' }));

      expect(authService.getCurrentUser()).toEqual({ id: 1, accesslevel: 'admin' });
    });
  });

  describe('isAdmin', () => {
    it.each([
      ['admin', { id: 1, accesslevel: 'admin' }, true],
      ['a regular user', { id: 2, accesslevel: 'user' }, false],
    ])('is decided by the access level: %s', (_case, user, expected) => {
      storage.setItem('user', JSON.stringify(user));

      expect(authService.isAdmin()).toBe(expected);
    });
  });

  describe('login', () => {
    it('calls /login with the credentials and stores the token and the user', async () => {
      const response = { token: 'tok', user: { id: 7 } };
      vi.mocked(apiRequest).mockResolvedValue(response);

      const result = await authService.login('a@b.com', 'secret');

      expect(apiRequest).toHaveBeenCalledTimes(1);
      const [endpoint, options] = vi.mocked(apiRequest).mock.calls[0];
      expect(endpoint).toBe('/login');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', userpassword: 'secret' });
      expect(storage.getItem('token')).toBe('tok');
      expect(JSON.parse(storage.getItem('user'))).toEqual({ id: 7 });
      expect(result).toBe(response);
    });

    it('stores nothing when the response has no token', async () => {
      vi.mocked(apiRequest).mockResolvedValue({ user: { id: 7 } });

      await authService.login('a@b.com', 'secret');

      expect(storage.getItem('token')).toBeNull();
      expect(storage.getItem('user')).toBeNull();
    });

    it('propagates the error when the request fails', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('invalid credentials'));

      await expect(authService.login('a@b.com', 'wrong')).rejects.toThrow('invalid credentials');
      expect(storage.getItem('token')).toBeNull();
    });
  });
});
