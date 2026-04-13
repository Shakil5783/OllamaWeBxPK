import ollama from 'ollama'

/**
 * ═══════════════════════════════════════════════════════════════
 * 🚀 OLLAMA CLOUD API HELPER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Cloud Models: https://ollama.com/search?c=cloud
 * Library: https://github.com/ollama/ollama-js
 * 
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Send a chat message with streaming response
 * @param {string} model - Model name (e.g., 'minimax-m2.7:cloud')
 * @param {Array} messages - Message array
 * @param {Function} onChunk - Callback for each chunk
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<string>} Complete response
 */
export const sendChatMessage = async (model, messages, onChunk, signal) => {
  try {
    const response = await ollama.chat({
      model,
      messages,
      stream: true,
    }, { signal });

    let fullResponse = '';
    
    for await (const part of response) {
      if (part.message?.content) {
        fullResponse += part.message.content;
        onChunk(part.message.content);
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
 * Send a chat message without streaming
 * @param {string} model - Model name
 * @param {Array} messages - Message array
 * @returns {Promise<Object>} Chat response
 */
export const sendChatMessageSync = async (model, messages) => {
  const response = await ollama.chat({
    model,
    messages,
    stream: false,
  });
  
  return response;
};

/**
 * Check API connection
 * @returns {Promise<boolean>}
 */
export const checkConnection = async () => {
  try {
    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud',
      messages: [{ role: 'user', content: 'ping' }],
      stream: false,
    });
    return !!response.message?.content;
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
};

/**
 * Get the configured model
 * @returns {string}
 */
export const getModelName = () => {
  return process.env.OLLAMA_MODEL || 'minimax-m2.7:cloud';
};
