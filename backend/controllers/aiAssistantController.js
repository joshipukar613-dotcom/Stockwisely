const { classifyByRegex, classifyQuestion } = require('../services/aiAssistant/questionClassifier');
const { fetchDataForCategory } = require('../services/aiAssistant/dataFetcher');
const { callGroq } = require('../services/aiAssistant/groq');
const { formatDataAnswer, buildAdvicePrompt } = require('../services/aiAssistant/promptContext');
const { getAdviceSummary } = require('../services/aiAssistant/dbQueries');
const { cache } = require('../services/aiAssistant/cache');

// ─────────────────────────────────────────────────────────────────────────────
//  Response-level cache TTLs
//  Data answers are cached for 2 minutes (they're deterministic from DB data)
//  Advice answers are NOT cached — they are personalized per question
// ─────────────────────────────────────────────────────────────────────────────
const DATA_RESPONSE_TTL_MS = parseInt(process.env.AI_DATA_RESPONSE_TTL_MS || '120000', 10); // 2 min

// In-flight guard: prevents duplicate simultaneous requests for the same question+mode
// Maps `"mode:question"` → Promise
const inFlightRequests = new Map();

/**
 * DATA QUERY MODE — 0 Groq API calls (unless regex misses and AI classification is needed)
 * Handles factual questions like "sales today", "low stock", "top products".
 * Uses regex classification + deterministic formatting.
 *
 * Caching layers (outermost to innermost):
 *  1. Response cache   — full answer string cached 2 min  (this file)
 *  2. DB query cache   — raw DB rows cached 60 s           (dbQueries.js)
 *  3. Classification   — AI category cached 5 min          (questionClassifier.js)
 */
async function ask(req, res) {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        answer: 'I need more information to answer that. Could you be more specific?',
        timestamp: new Date().toISOString(),
      });
    }

    const q = question.trim();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[AI Assistant][Data Mode] Question: "${q}"`);

    // ── Layer 1: Full response cache ─────────────────────────────────────────
    const responseCacheKey = `response:data:${q.toLowerCase()}`;
    const cachedResponse = cache.get(responseCacheKey);
    if (cachedResponse) {
      console.log('[Data Mode] ✓ Full response cache hit — 0 API calls, 0 DB queries');
      return res.json({ ...cachedResponse, cached: true });
    }

    // ── In-flight deduplication ───────────────────────────────────────────────
    const inFlightKey = `data:${q.toLowerCase()}`;
    if (inFlightRequests.has(inFlightKey)) {
      console.log('[Data Mode] Deduplicating in-flight request');
      const result = await inFlightRequests.get(inFlightKey);
      return res.json({ ...result, cached: true });
    }

    const requestPromise = (async () => {
      // ── Step 1: Classify using regex (0 API calls) ──────────────────────────
      let category = classifyByRegex(q);

      if (category) {
        console.log(`[Step 1] Regex match: ${category}`);
      } else {
        // ── Step 1b: AI classification fallback (1 API call, result cached 5 min) ──
        try {
          category = await classifyQuestion(q);
          console.log(`[Step 1b] AI Classification: ${category}`);
        } catch (error) {
          console.warn('[Step 1b] AI Classification failed, using GENERAL_QUESTION');
          category = 'GENERAL_QUESTION';
        }
      }

      // ── Step 2: Handle UNSUPPORTED questions ─────────────────────────────────
      if (category === 'UNSUPPORTED') {
        return {
          answer:
            'I can only help with questions about your business data like sales, inventory, customers, and purchases.\n\n💡 **Tip:** Switch to "Get Advice" mode for business suggestions!',
          timestamp: new Date().toISOString(),
        };
      }

      // ── Step 3: Fetch relevant data from database (cached internally) ────────
      let data;
      try {
        data = await fetchDataForCategory(category, q);
        console.log(`[Step 3] Data fetched for ${category}`);
      } catch (error) {
        console.error('[Step 3] Data fetch error:', error.message);
        if (error.message.includes('CATEGORY_NOT_IMPLEMENTED')) {
          return {
            answer:
              `I understand you're asking about that, but this specific analysis isn't available yet.\n\nTry asking about:\n• Sales (today, yesterday, this week, this month)\n• Sales returns\n• Top products\n• Low stock items\n\n💡 Or switch to **"Get Advice"** mode for business suggestions!`,
            timestamp: new Date().toISOString(),
          };
        }
        throw error;
      }

      // ── Step 4: Format answer deterministically (0 API calls) ────────────────
      const answer = formatDataAnswer(category, data);
      console.log('[Step 4] Formatted answer (no Groq).');

      return {
        answer,
        category,
        mode: 'data',
        timestamp: new Date().toISOString(),
      };
    })();

    // Register in in-flight map; clean up when done
    inFlightRequests.set(inFlightKey, requestPromise);
    requestPromise.finally(() => inFlightRequests.delete(inFlightKey));

    const result = await requestPromise;

    // Cache the full response so future identical questions skip everything
    cache.set(responseCacheKey, result, DATA_RESPONSE_TTL_MS);

    return res.json(result);
  } catch (error) {
    console.error('[AI Assistant][Data Mode] Error:', error);
    return res.status(500).json({
      answer: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ADVICE MODE — 1 Groq API call
 * Handles strategic questions like "how to increase sales",
 * "what products should I focus on", etc.
 * Advice Mode — Fetches summary data and sends to Groq for analysis.
 */
async function askAdvice(req, res) {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        answer: 'Please ask a specific business question for advice.',
        timestamp: new Date().toISOString(),
      });
    }

    const q = question.trim();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[AI Assistant][Advice Mode] Question: "${q}"`);

    // ── In-flight deduplication (advice) ─────────────────────────────────────
    const inFlightKey = `advice:${q.toLowerCase()}`;
    if (inFlightRequests.has(inFlightKey)) {
      console.log('[Advice Mode] Deduplicating in-flight advice request');
      const result = await inFlightRequests.get(inFlightKey);
      return res.json(result);
    }

    const requestPromise = (async () => {
      // ── Step 1: Fetch business summary (cached internally, 0 Groq calls) ───
      let summaryData;
      try {
        summaryData = await getAdviceSummary();
        console.log('[Advice Step 1] Business summary fetched.');
      } catch (error) {
        console.error('[Advice Step 1] Failed to fetch summary:', error.message);
        summaryData = {
          salesToday: { total: 0, count: 0 },
          salesMonth: { total: 0, count: 0 },
          returnsToday: { total: 0, count: 0 },
          returnsMonth: { total: 0, count: 0 },
          monthComparison: { thisMonthSales: 0, lastMonthSales: 0, growthPercent: null },
          topProducts: [],
          lowStockItems: [],
          lowStockCount: 0,
        };
      }

      // ── Step 2: Build prompt and call Groq (1 API call with retry/backoff) ─
      const prompt = buildAdvicePrompt({ question: q, summaryData });

      try {
        console.log('[Advice Step 2] Calling Groq for advice...');
        const { answer: advice } = await callGroq(prompt);
        const answer = advice || "I couldn't generate advice right now. Please try again.";

        console.log('[Advice Step 2] ✓ Advice generated.');
        return {
          answer: `💡 **Business Advice**\n\n${answer.trim()}`,
          mode: 'advice',
          timestamp: new Date().toISOString(),
        };
      } catch (aiError) {
        console.warn('[Advice Step 2] Gemini failed:', aiError.message);

        // User-friendly error messages per error type
        if (aiError.code === 'AI_RATE_LIMIT') {
          return {
            answer:
              '⚠️ The AI advisor is temporarily busy (rate limit reached). Please wait 30–60 seconds and try again.',
            mode: 'advice',
            rateLimited: true,
            timestamp: new Date().toISOString(),
          };
        }

        if (aiError.code === 'AI_KEY_MISSING' || aiError.code === 'AI_AUTH') {
          return {
            answer:
              '⚠️ AI advisor is unavailable (API key issue). Please contact your administrator.',
            mode: 'advice',
            timestamp: new Date().toISOString(),
          };
        }

        // General fallback — still return useful business data
        const { formatRs } = require('../services/aiAssistant/promptContext');
        const fallback =
          `I'm having trouble connecting to the AI advisor right now. Here's your current business snapshot:\n\n` +
          `📊 Today's Sales: ${formatRs(summaryData.salesToday?.total)} (${summaryData.salesToday?.count || 0} invoices)\n` +
          `📊 Monthly Sales: ${formatRs(summaryData.salesMonth?.total)}\n` +
          `🔄 Today's Returns: ${formatRs(summaryData.returnsToday?.total)}\n` +
          `⚠️ Low Stock Items: ${summaryData.lowStockCount || 0}\n\n` +
          `Please try again in a moment for personalized advice.`;

        return {
          answer: fallback,
          mode: 'advice',
          timestamp: new Date().toISOString(),
        };
      }
    })();

    inFlightRequests.set(inFlightKey, requestPromise);
    requestPromise.finally(() => inFlightRequests.delete(inFlightKey));

    const result = await requestPromise;
    return res.json(result);
  } catch (error) {
    console.error('[AI Assistant][Advice Mode] Error:', error);
    return res.status(500).json({
      answer: 'Sorry, I encountered an error generating advice. Please try again.',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { ask, askAdvice };
