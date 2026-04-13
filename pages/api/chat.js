// ═══════════════════════════════════════════════════════════════
// 🤖 OLLAMA CHAT API ROUTE
// ═══════════════════════════════════════════════════════════════

import { Ollama } from 'ollama';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // 🔐 GET API KEY FROM HEADER
    // ═══════════════════════════════════════════════════════════
    
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API key required. Please add your API key in Settings.',
        hint: 'Click the ⚙️ settings icon and paste your Ollama API key',
      });
    }

    const { messages, stream = true, model: requestModel } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format.' });
    }

    // Model selection
    const model = requestModel || 'minimax-m2.7:cloud';

    // ═══════════════════════════════════════════════════════════
    // 🚀 CONFIGURE OLLAMA CLIENT FOR CLOUD
    // ═══════════════════════════════════════════════════════════
    
    const ollama = new Ollama({
      host: 'https://ollama.com',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // ═══════════════════════════════════════════════════════════
    // 📡 STREAMING RESPONSE
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
      // ═══════════════════════════════════════════════════════════
      // 💬 SYNC RESPONSE
      // ═══════════════════════════════════════════════════════════
      
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
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Handle specific errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return res.status(503).json({ 
        error: 'Cannot connect to Ollama Cloud. Network error.',
        hint: 'Please check your internet connection and try again.',
      });
    }
    
    if (error.response?.status === 401 || error.message?.includes('401')) {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your key in Settings.',
      });
    }
    
    if (error.response?.status === 404 || error.message?.includes('model')) {
      return res.status(404).json({ 
        error: `Model "${req.body.model || 'minimax-m2.7:cloud'}" not found.`,
        hint: 'Try selecting a different model in Settings.',
      });
    }
    
    return res.status(500).json({ 
      error: error.message || 'Failed to get response from Ollama',
      hint: 'Please try again or select a different model.',
    });
  }
}
