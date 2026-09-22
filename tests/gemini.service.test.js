const env = require('../src/config/env');
const { generateStructured } = require('../src/services/gemini.service');

describe('generateStructured retry behavior', () => {
  const originalFetch = global.fetch;
  const originalApiKey = env.geminiApiKey;

  beforeEach(() => {
    env.geminiApiKey = 'test-key';
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    env.geminiApiKey = originalApiKey;
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it.each([429, 503])('retries status %i once and returns the second response', async (status) => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status, text: async () => 'temporary failure' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"success":true}' }] } }] }),
      });

    const resultPromise = generateStructured('test', { type: 'object' });
    await jest.advanceTimersByTimeAsync(500);

    await expect(resultPromise).resolves.toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient provider error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad request' });

    await expect(generateStructured('test', { type: 'object' })).rejects.toMatchObject({ statusCode: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
