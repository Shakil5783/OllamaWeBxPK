// ═══════════════════════════════════════════════════════════════
// 🤖 OLLAMA CHAT API ROUTE
// ═══════════════════════════════════════════════════════════════

import ollama from 'ollama';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // 🔐 GET CONFIGURATION
    // ═══════════════════════════════════════════════════════════
    
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud';

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'OLLAMA_API_KEY not configured. Please add it to your Render environment variables.',
        setupUrl: 'https://ollama.com/settings/keys',
      });
    }

    const { messages, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format. Expected array.' });
    }

    // ═══════════════════════════════════════════════════════════
    // 🚀 SEND TO OLLAMA
    // ═══════════════════════════════════════════════════════════
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await ollama.chat({
        model,
        messages,
        stream: true,
      });

      let fullContent = '';

      for await (const part of response) {
        if (part.message?.content) {
          fullContent += part.message.content;
          res.write(`data: ${JSON.stringify({ 
            content: part.message.content,
            done: false 
          })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ 
        content: '',
        done: true,
        fullContent 
      })}\n\n`);

      res.end();

    } else {
      const response = await ollama.chat({
        model,
        messages,
        stream: false,
      });

      return res.status(200).json({
        message: response.message,
        done: true,
      });
    }

  } catch (error) {
    console.error('Ollama API Error:', error);
    
    // Handle specific errors
    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your OLLAMA_API_KEY.',
      });
    }
    
    if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
      return res.status(503).json({ 
        error: 'Cannot connect to Ollama Cloud. Please check your internet connection.',
      });
    }
    
    return res.status(500).json({ 
      error: error.message || 'Failed to get response from Ollama',
    });
  }
}
