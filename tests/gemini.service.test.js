const env = require('../src/config/env');
const { generateStructured } = require('../src/services/gemini.service');

describe('generateStructured retry behavior', () => {
  const originalFetch = global.fetch;
  const originalApiKey = env.geminiApiKey;
  let randomSpy;

  beforeEach(() => {
    env.geminiApiKey = 'test-key';
    global.fetch = jest.fn();
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    randomSpy.mockRestore();
    env.geminiApiKey = originalApiKey;
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it.each([429, 500, 503])('retries transient status %i and returns the second response', async (status) => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status, text: async () => 'temporary failure' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"success":true}' }] } }] }),
      });

    const resultPromise = generateStructured('test', { type: 'object' });
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(resultPromise).resolves.toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff and stops after four failed attempts', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503, text: async () => 'temporarily overloaded' });

    const resultPromise = generateStructured('test', { type: 'object' });
    const rejection = expect(resultPromise).rejects.toMatchObject({ statusCode: 502 });
    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);

    await rejection;
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('honors the provider retry delay on quota errors', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: jest.fn().mockReturnValue(null) },
        text: async () => JSON.stringify({ error: { message: 'Please retry in 12s.' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"success":true}' }] } }] }),
      });

    const resultPromise = generateStructured('test', { type: 'object' });
    await jest.advanceTimersByTimeAsync(11_999);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry an exhausted daily quota', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({
        error: {
          details: [{
            violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }],
          }],
        },
      }),
    });

    await expect(generateStructured('test', { type: 'object' })).rejects.toMatchObject({ statusCode: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('uses minimal thinking for structured requests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"success":true}' }] } }] }),
    });

    await expect(generateStructured('test', { type: 'object' })).resolves.toEqual({ success: true });
    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.generationConfig).toMatchObject({ thinkingConfig: { thinkingLevel: 'minimal' } });
    expect(request.generationConfig).not.toHaveProperty('temperature');
  });

  it('does not retry a non-transient provider error', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad request' });

    await expect(generateStructured('test', { type: 'object' })).rejects.toMatchObject({ statusCode: 502 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
