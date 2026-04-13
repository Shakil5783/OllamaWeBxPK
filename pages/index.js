import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage, checkConnection } from '../lib/ollama';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════
  // 🔗 CHECK CONNECTION
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const verifyConnection = async () => {
      const connected = await checkConnection();
      setIsConnected(connected);
    };
    verifyConnection();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // 🔄 AUTO-SCROLL
  // ═══════════════════════════════════════════════════════════════
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ═══════════════════════════════════════════════════════════════
  // 💬 SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const userMessage = inputValue.trim();
    if (!userMessage || isLoading) return;

    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');
    
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
    };

    const assistantMsg = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    apiMessages.push({ role: 'user', content: userMessage });

    abortControllerRef.current = new AbortController();

    let accumulatedContent = '';

    try {
      await sendChatMessage(
        'minimax-m2.7:cloud',
        apiMessages,
        (chunk) => {
          accumulatedContent += chunk;
          setStreamingContent(accumulatedContent);
        },
        abortControllerRef.current.signal
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: accumulatedContent }
            : msg
        )
      );

    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: `⚠️ Error: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🛑 ABORT HANDLER
  // ═══════════════════════════════════════════════════════════════
  
  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🗑️ CLEAR CHAT
  // ═══════════════════════════════════════════════════════════════
  
  const handleClearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  return (
    <>
      <Head>
        <title>🤖 Ollama Chat Pro | Cloud AI</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>" />
      </Head>

      <div className="min-h-screen bg-slate-950">
        {/* ═══════════════════════════════════════════════════════
             🌟 HEADER
             ═══════════════════════════════════════════════════════ */}
        
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🤖</span>
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    OLLAMA CHAT PRO
                  </h1>
                  <p className="text-xs text-slate-500">
                    ✨ minimax-m2.7:cloud • Streaming Ready
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-xs text-slate-400">
                    {isConnected ? '🟢 Connected' : '🔴 Offline'}
                  </span>
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={handleClearChat}
                    className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════
             💬 CHAT AREA
             ═══════════════════════════════════════════════════════ */}
        
        <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-96 text-center">
              <span className="text-8xl mb-6 animate-bounce">🌟</span>
              <h2 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
                Welcome to Ollama Chat Pro
              </h2>
              <p className="text-slate-400 max-w-xl mb-8">
                🚀 Start a conversation with AI-powered by Ollama Cloud
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {[
                  '💡 Explain quantum computing simply',
                  '🎨 Write a creative story about AI',
                  '📚 Help me understand ML basics',
                  '🌍 Latest advancements in AI?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(prompt.substring(2))}
                    className="p-4 text-left bg-slate-900/50 hover:bg-slate-800/50 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-all text-sm text-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/30 rounded-tr-sm'
                      : 'bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-tl-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{message.role === 'user' ? '👤' : '🤖'}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      message.role === 'user' ? 'text-cyan-400' : 'text-purple-400'
                    }`}>
                      {message.role}
                    </span>
                  </div>
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {streamingContent && (
            <div className="flex justify-start mt-4">
              <div className="max-w-2xl rounded-2xl rounded-tl-sm px-6 py-4 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span>🤖</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    streaming
                  </span>
                  <div className="flex gap-1 ml-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
                <div className="text-base leading-relaxed whitespace-pre-wrap text-slate-300">
                  {streamingContent}<span className="animate-pulse text-purple-400">▊</span>
                </div>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex justify-start mt-4">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl rounded-tl-sm px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">🤖</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* ═══════════════════════════════════════════════════════
             ✏️ INPUT AREA
             ═══════════════════════════════════════════════════════ */}
        
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="✨ Type your message... (Enter to send)"
                  disabled={isLoading || !isConnected}
                  rows={1}
                  className="w-full px-6 py-4 bg-slate-800 border-2 border-slate-700 focus:border-purple-500 rounded-2xl text-white placeholder-slate-500 resize-none outline-none transition-colors disabled:opacity-50"
                  style={{ maxHeight: '200px' }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim() || !isConnected}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-2xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                >
                  {isLoading ? '⏳' : '🚀'} Send
                </button>

                {isLoading && (
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 rounded-xl text-sm text-red-400 transition-colors"
                  >
                    🛑 Stop
                  </button>
                )}
              </div>
            </form>

            <p className="mt-3 text-center text-xs text-slate-600">
              💡 Press Enter to send • Model: minimax-m2.7:cloud
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
