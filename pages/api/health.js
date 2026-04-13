// ═══════════════════════════════════════════════════════════════
// 💚 HEALTH CHECK API ROUTE
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud';

  // ═══════════════════════════════════════════════════════════
  // 🔐 CHECK IF API KEY IS CONFIGURED
  // ═══════════════════════════════════════════════════════════
  
  if (!apiKey) {
    return res.status(200).json({
      status: 'error',
      model,
      connected: false,
      error: 'OLLAMA_API_KEY not configured',
      message: 'Please add OLLAMA_API_KEY to your environment variables',
      setupUrl: 'https://ollama.com/settings/keys',
    });
  }

  // API key exists - return success (actual connection tested on first chat)
  return res.status(200).json({
    status: 'ok',
    model,
    connected: true,
    message: 'API key configured. Connection will be tested when sending first message.',
  });
}
