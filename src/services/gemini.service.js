const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/apiError');

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 1_000;
const RETRY_JITTER_MS = 250;
const MAX_RETRY_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 60_000;

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timeout);
      reject(signal.reason);
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function isDailyQuotaError(responseBody) {
  try {
    const data = JSON.parse(responseBody);
    return data.error?.details?.some((detail) => detail.violations?.some(
      (violation) => typeof violation.quotaId === 'string' && violation.quotaId.includes('PerDay'),
    )) || false;
  } catch (error) {
    return false;
  }
}

function parseRetryDelayMs(response, responseBody) {
  const retryAfter = response.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }

  try {
    const data = JSON.parse(responseBody);
    const retryInfo = data.error?.details?.find((detail) => typeof detail.retryDelay === 'string');
    const duration = retryInfo?.retryDelay?.match(/^([0-9.]+)s$/);
    if (duration) return Number(duration[1]) * 1_000;

    const messageDelay = data.error?.message?.match(/retry in ([0-9.]+)s/i);
    if (messageDelay) return Number(messageDelay[1]) * 1_000;
  } catch (error) {
    // Non-JSON provider errors fall back to exponential backoff.
  }

  return 0;
}

function retryDelay(attempt, response, responseBody) {
  const exponentialDelay = BASE_RETRY_DELAY_MS * 2 ** attempt;
  const providerDelay = parseRetryDelayMs(response, responseBody);
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
  return Math.min(Math.max(exponentialDelay, providerDelay) + jitter, MAX_RETRY_DELAY_MS);
}

async function generateStructured(prompt, responseSchema) {
  if (!env.geminiApiKey) throw new ApiError(503, 'AI features are not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema,
              thinkingConfig: { thinkingLevel: 'minimal' },
            },
          }),
          signal: controller.signal,
        },
      );

      if (response.ok) break;
      const responseBody = await response.text();
      if (attempt < MAX_ATTEMPTS - 1 && isRetryableStatus(response.status) && !isDailyQuotaError(responseBody)) {
        const delayMs = retryDelay(attempt, response, responseBody);
        logger.warn(
          { status: response.status, attempt: attempt + 1, maxAttempts: MAX_ATTEMPTS, delayMs },
          'Gemini temporarily unavailable; retrying',
        );
        await wait(delayMs, controller.signal);
        continue;
      }

      logger.error({ status: response.status, responseBody: responseBody.slice(0, 1000) }, 'Gemini returned an error');
      throw new ApiError(502, 'AI service is temporarily unavailable');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error({ err: error }, 'Gemini request failed');
    throw new ApiError(502, 'AI service is temporarily unavailable');
  } finally {
    clearTimeout(timeout);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new ApiError(502, 'AI service returned an invalid result');
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  if (!text) throw new ApiError(502, 'AI service returned no usable result');

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError(502, 'AI service returned an invalid result');
  }
}

module.exports = { generateStructured };
