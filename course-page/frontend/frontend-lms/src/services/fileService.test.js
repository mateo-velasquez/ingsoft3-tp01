import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileService } from './fileService.js';
import { apiRequest } from './api.js';

vi.mock('./api.js', () => ({ apiRequest: vi.fn() }));

describe('fileService', () => {
  afterEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it('uploads the file as FormData under the "files" field', async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    await fileService.uploadFileForSubscription(8, file);

    const [endpoint, options] = vi.mocked(apiRequest).mock.calls[0];
    expect(endpoint).toBe('/course/subscription/8/files');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('files').name).toBe('notes.txt');
  });

  it.each([
    ['getFilesBySubscription', () => fileService.getFilesBySubscription(8), '/subscription/8/files'],
    ['getFilesByCourse', () => fileService.getFilesByCourse(4), '/course/4/files'],
  ])('%s calls the right endpoint', async (_name, call, endpoint) => {
    vi.mocked(apiRequest).mockResolvedValue([]);

    await call();

    expect(apiRequest).toHaveBeenCalledWith(endpoint);
  });

  it('propagates the error of the upload', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('file too big'));

    await expect(fileService.uploadFileForSubscription(8, new File(['x'], 'a.txt'))).rejects.toThrow('file too big');
  });
});
