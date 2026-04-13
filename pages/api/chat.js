// ═══════════════════════════════════════════════════════════════
// 🤖 OLLAMA CHAT API ROUTE (Server-Side Only)
// ═══════════════════════════════════════════════════════════════

import ollama from 'ollama';

export default async function handler(req, res) {
  // ═══════════════════════════════════════════════════════════════
  // 🌟 CORS HEADERS
  // ═══════════════════════════════════════════════════════════════
  
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
    // ═══════════════════════════════════════════════════════════════
    // 🔐 AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════
    
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud';

    if (!apiKey) {
      return res.status(500).json({ 
        error: '❌ OLLAMA_API_KEY not configured. Please add to .env file.' 
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 📥 GET REQUEST DATA
    // ═══════════════════════════════════════════════════════════════
    
    const { messages, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚀 SEND TO OLLAMA CLOUD API
    // ═══════════════════════════════════════════════════════════════
    
    if (stream) {
      // ═══════════════════════════════════════════════════════════
      // 📡 STREAMING RESPONSE
      // ═══════════════════════════════════════════════════════════
      
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
          
          // Send SSE event
          res.write(`data: ${JSON.stringify({ 
            content: part.message.content,
            done: false 
          })}\n\n`);
        }
      }

      // Send completion event
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
    
    return res.status(500).json({ 
      error: error.message || 'Failed to get response from Ollama' 
    });
  }
}
