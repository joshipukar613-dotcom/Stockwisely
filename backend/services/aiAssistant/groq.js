/**
 * groq.js — Centralized Groq API client
 *
 * Key guarantees:
 *  - Primary model + ONE fallback — no loop
 *  - Exponential back-off that HONORS Groq's retry recommendations
 *  - In-flight deduplication: concurrent identical prompts share ONE HTTP request
 *  - Max total wait before giving up: ~90 seconds across all retries
 */

const DEFAULT_MODEL  = process.env.GROQ_MODEL  || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = process.env.GROQ_FALLBACK || 'llama3-8b-8192';

// How many times to retry per model on 429
const MAX_RETRIES    = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const BASE_DELAY_MS  = parseInt(process.env.GEMINI_BASE_DELAY_MS || '5000', 10);
const MAX_DELAY_MS   = parseInt(process.env.GEMINI_MAX_DELAY_MS || '35000', 10);

// In-flight deduplication (key: prompt string, value: Promise)
const inFlight = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRetryDelay(errorMsg, attempt) {
  if (errorMsg) {
    const m = errorMsg.match(/Please try again in (\d+(?:\.\d+)?)s/i);
    if (m) {
      const recommended = Math.ceil(parseFloat(m[1])) * 1000;
      const jitter = Math.floor(Math.random() * 2000);
      return Math.min(recommended + jitter, MAX_DELAY_MS);
    }
  }
  const base   = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const capped = Math.min(base, MAX_DELAY_MS);
  return Math.floor(Math.random() * capped);
}

async function callGroqOnce(prompt, model) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('Groq API key missing');
    err.code = 'AI_KEY_MISSING';
    throw err;
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const errorMsg = data?.error?.message || `Groq API request failed (${resp.status})`;
    const err = new Error(errorMsg);
    err.status = resp.status;
    err.apiData = data;
    
    if (resp.status === 401 || resp.status === 403) err.code = 'AI_AUTH';
    else if (resp.status === 429) err.code = 'AI_RATE_LIMIT';
    else if (resp.status === 404) err.code = 'AI_MODEL_NOT_FOUND';
    else err.code = 'AI_UNKNOWN';
    
    throw err;
  }

  const answer = data?.choices?.[0]?.message?.content?.trim() || '';

  if (!answer) throw new Error('Groq returned empty answer');

  return { answer, modelUsed: model };
}

async function tryModelWithRetries(prompt, model) {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Groq API] Calling model: ${model}` + (attempt > 1 ? ` (retry ${attempt}/${MAX_RETRIES})` : ''));
      return await callGroqOnce(prompt, model);
    } catch (err) {
      lastErr = err;

      if (err.code === 'AI_RATE_LIMIT') {
        if (attempt < MAX_RETRIES) {
          const delay = resolveRetryDelay(err.message, attempt);
          
          if (delay > 10000) {
             console.warn(`[Groq API] Rate limited on ${model}. Required wait (${(delay / 1000).toFixed(1)}s) is too long. Failing fast.`);
             break;
          }

          console.warn(`[Groq API] Rate limited (429) on ${model}. Waiting ${(delay / 1000).toFixed(1)} s before retry ${attempt + 1}/${MAX_RETRIES}`);
          await sleep(delay);
          continue;
        }
        console.error(`[Groq API] ${model} rate-limited after all ${MAX_RETRIES} retries.`);
        break;
      }

      if (err.code === 'AI_MODEL_NOT_FOUND') {
        console.warn(`[Groq API] Model ${model} not found (404).`);
        break;
      }

      console.error(`[Groq API] Non-retriable error on ${model}: ${err.message}`);
      break;
    }
  }

  throw lastErr;
}

async function callGroq(prompt) {
  if (inFlight.has(prompt)) {
    console.log('[Groq API] Deduplicating in-flight request');
    return inFlight.get(prompt);
  }

  const requestPromise = (async () => {
    try {
      const result = await tryModelWithRetries(prompt, DEFAULT_MODEL);
      console.log(`[Groq API] ✓ Success with primary model: ${DEFAULT_MODEL}`);
      return result;
    } catch (primaryErr) {
      const isQuotaError = primaryErr.code === 'AI_RATE_LIMIT' || primaryErr.code === 'AI_MODEL_NOT_FOUND';

      if (!isQuotaError) throw primaryErr;

      if (FALLBACK_MODEL && FALLBACK_MODEL !== DEFAULT_MODEL) {
        console.warn(`[Groq API] Primary model exhausted. Trying fallback: ${FALLBACK_MODEL}`);
        try {
          const result = await tryModelWithRetries(prompt, FALLBACK_MODEL);
          console.log(`[Groq API] ✓ Success with fallback model: ${FALLBACK_MODEL}`);
          return result;
        } catch (fallbackErr) {
          console.error(`[Groq API] Fallback model also failed: ${fallbackErr.message}`);
          throw fallbackErr;
        }
      }

      throw primaryErr;
    }
  })();

  inFlight.set(prompt, requestPromise);
  requestPromise.finally(() => inFlight.delete(prompt));

  return requestPromise;
}

module.exports = { callGroq };
