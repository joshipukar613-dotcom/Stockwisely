require('dotenv').config();
const apiKey = process.env.GOOGLE_AI_KEY;

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

listModels();
