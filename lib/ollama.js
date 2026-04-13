// ═══════════════════════════════════════════════════════════════
// 🌐 FRONTEND API HELPER (Calls our Next.js API Route)
// ═══════════════════════════════════════════════════════════════

const API_BASE = '';

/**
 * Send chat message with streaming to our API route
 * @param {Array} messages - Message array
 * @param {Function} onChunk - Callback for each chunk
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<string>} Complete response
 */
export const sendChatMessage = async (messages, onChunk, signal) => {
  let fullResponse = '';

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, stream: true }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.content) {
              fullResponse += data.content;
              onChunk(data.content);
            }
            
            if (data.done) {
              return fullResponse;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }

    return fullResponse;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Stream aborted by user');
    }
    throw error;
  }
};

/**
 * Send chat message without streaming
 * @param {Array} messages - Message array
 * @returns {Promise<Object>} Chat response
 */
export const sendChatMessageSync = async (messages) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, stream: false }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

/**
 * Check API connection
 * @returns {Promise<{connected: boolean, model: string}>}
 */
export const checkConnection = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    
    if (!response.ok) {
      return { connected: false, model: null };
    }

    const data = await response.json();
    return {
      connected: data.connected,
      model: data.model,
      status: data.status,
    };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { connected: false, model: null };
  }
};

/**
 * Get configured model name
 */
export const getModelName = () => {
  return 'minimax-m2.7:cloud';
};
