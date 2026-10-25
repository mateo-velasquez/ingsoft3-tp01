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
      ['admin as the api sends it', { id: 1, accesslevel: 'Admin' }, true],
      ['a regular user', { id: 2, accesslevel: 'user' }, false],
      ['a regular user as the api sends it', { id: 2, accesslevel: 'User' }, false],
    ])('is decided by the access level: %s', (_case, user, expected) => {
      storage.setItem('user', JSON.stringify(user));

      expect(authService.isAdmin()).toBe(expected);
    });
  });

  describe('session helpers', () => {
    it('logout removes the token and the user', () => {
      storage.setItem('token', 'tok');
      storage.setItem('user', JSON.stringify({ id: 1 }));

      authService.logout();

      expect(storage.getItem('token')).toBeNull();
      expect(storage.getItem('user')).toBeNull();
    });

    it.each([
      ['there is a token', 'tok', true],
      ['there is no token', undefined, false],
    ])('isAuthenticated depends on the token: %s', (_case, token, expected) => {
      if (token !== undefined) storage.setItem('token', token);

      expect(authService.isAuthenticated()).toBe(expected);
    });

    it('getToken returns the stored token', () => {
      storage.setItem('token', 'tok');

      expect(authService.getToken()).toBe('tok');
    });
  });

  describe('isTeacher', () => {
    it.each([
      ['there is no user', undefined],
      ['the user has no id', JSON.stringify({ name: 'Ana' })],
    ])('is false without asking the server when %s', async (_case, stored) => {
      if (stored !== undefined) storage.setItem('user', stored);

      await expect(authService.isTeacher()).resolves.toBe(false);
      expect(apiRequest).not.toHaveBeenCalled();
    });

    it.each([
      ['the server says it is a teacher', { is_teacher: true }, true],
      ['the server says it is not a teacher', { is_teacher: false }, false],
      ['the answer has no is_teacher field', {}, false],
    ])('asks the server and returns the answer when %s', async (_case, response, expected) => {
      storage.setItem('user', JSON.stringify({ id: 4 }));
      vi.mocked(apiRequest).mockResolvedValue(response);

      await expect(authService.isTeacher()).resolves.toBe(expected);
      expect(apiRequest).toHaveBeenCalledWith('/user/4/is-teacher');
    });

    it('is false when the request fails', async () => {
      storage.setItem('user', JSON.stringify({ id: 4 }));
      vi.mocked(apiRequest).mockRejectedValue(new Error('network down'));

      await expect(authService.isTeacher()).resolves.toBe(false);
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
