const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/apiError');

const RETRYABLE_STATUSES = new Set([429, 503]);
const RETRY_DELAY_MS = 500;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateStructured(prompt, responseSchema) {
  if (!env.geminiApiKey) throw new ApiError(503, 'AI features are not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.1 },
          }),
          signal: controller.signal,
        },
      );

      if (response.ok) break;
      const responseBody = await response.text();
      if (attempt === 0 && RETRYABLE_STATUSES.has(response.status)) {
        logger.warn({ status: response.status }, 'Gemini unavailable; retrying once');
        await wait(RETRY_DELAY_MS);
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
