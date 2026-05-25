require('dotenv').config();
const { classifyQuestion } = require('./services/aiAssistant/questionClassifier');
const { fetchDataForCategory } = require('./services/aiAssistant/dataFetcher');

async function testVaries() {
  const inputs = [
    "show me returns from today",
    "how many sales were returned yesterday",
    "which item sold the most",
    "आजको sales",
    "what to reorder",
    "how's business today",
    "weather in Kathmandu"
  ];

  for (const q of inputs) {
    console.log(`\nTesting: "${q}"`);
    try {
      const category = await classifyQuestion(q);
      console.log(`Result: ${category}`);
      
      if (category !== 'UNSUPPORTED' && category !== 'GENERAL_QUESTION') {
          // We won't actually run DB queries here to avoid side effects/errors in mock env, 
          // but we can check if dataFetcher has the case
          console.log(`DataFetcher should handle: ${category}`);
      }
    } catch (err) {
      console.error(`Error for "${q}":`, err.message);
    }
  }
}

testVaries();
