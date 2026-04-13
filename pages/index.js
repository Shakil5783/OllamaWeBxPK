import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [currentModel, setCurrentModel] = useState('minimax-m2.7:cloud');
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // 💾 LOAD API KEY FROM LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    const savedKey = localStorage.getItem('ollama_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    
    const savedModel = localStorage.getItem('ollama_model');
    if (savedModel) {
      setCurrentModel(savedModel);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🔄 AUTO-SCROLL
  // ═══════════════════════════════════════════════════════════
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ═══════════════════════════════════════════════════════════
  // ⚙️ SAVE SETTINGS
  // ═══════════════════════════════════════════════════════════
  
  const handleSaveSettings = () => {
    if (apiKey.trim()) {
      localStorage.setItem('ollama_api_key', apiKey.trim());
    }
    if (currentModel.trim()) {
      localStorage.setItem('ollama_model', currentModel.trim());
    }
    setShowSettings(false);
  };

  // ═══════════════════════════════════════════════════════════
  // 💬 SEND MESSAGE
  // ═══════════════════════════════════════════════════════════
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const userMessage = inputValue.trim();
    if (!userMessage || isLoading) return;
    
    if (!apiKey && !process.env.NEXT_PUBLIC_DEMO_MODE) {
      setShowSettings(true);
      return;
    }

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          stream: true,
          model: currentModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
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
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
              }
            } catch (e) {}
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: accumulatedContent }
            : msg
        )
      );

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsg.id
              ? { ...msg, content: '⏹️ Generation stopped' }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsg.id
              ? { ...msg, content: `⚠️ ${error.message}` }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleAbort = () => {
    abortControllerRef.current?.abort();
  };

  const handleClearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  return (
    <>
      <Head>
        <title>Ollama Chat</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>" />
      </Head>

      {/* ═══════════════════════════════════════════════════════════
           🎨 MAIN CONTAINER
           ═══════════════════════════════════════════════════════════ */}
      <div className="min-h-screen bg-black text-white flex flex-col">
        
        {/* ═══════════════════════════════════════════════════════════
             🌸 HEADER
             ═══════════════════════════════════════════════════════════ */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-lg">
              O
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Ollama Chat</h1>
              <p className="text-xs text-zinc-500">{currentModel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════
             💬 MESSAGES AREA
             ═══════════════════════════════════════════════════════════ */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            
            {/* Welcome State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 flex items-center justify-center mb-6">
                  <span className="text-4xl">✨</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Start a conversation</h2>
                <p className="text-zinc-500 mb-8 max-w-md">
                  Ask questions, get explanations, or explore ideas with AI
                </p>
                
                {/* Example Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    'Explain quantum computing',
                    'Write a Python function',
                    'What is machine learning?',
                    'Help me brainstorm ideas',
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(prompt)}
                      className="p-4 text-left rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-all text-sm text-zinc-300 group"
                    >
                      <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{prompt}</span>
                      <span className="block mt-2 text-xs text-violet-500/60 group-hover:text-violet-500 transition-colors">Click to try →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'
                  }`}>
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`max-w-[80%] space-y-2 ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/20 rounded-tr-sm'
                        : 'bg-zinc-900/80 border border-zinc-800/50 rounded-tl-sm'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Streaming Indicator */}
            {streamingContent && (
              <div className="flex gap-4 mt-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-900/80 border border-zinc-800/50 text-sm">
                  <div className="flex gap-1 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse delay-200" />
                  </div>
                  {streamingContent}<span className="animate-pulse">▊</span>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && !streamingContent && (
              <div className="flex gap-4 mt-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm flex-shrink-0">
                  🤖
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-900/80 border border-zinc-800/50">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════════
             ✏️ INPUT AREA
             ═══════════════════════════════════════════════════════════ */}
        <footer className="border-t border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 pr-24 bg-zinc-900 border border-zinc-800 focus:border-violet-500/50 rounded-xl text-sm text-white placeholder-zinc-600 resize-none outline-none transition-colors disabled:opacity-50 focus:ring-2 focus:ring-violet-500/20"
                style={{ maxHeight: '150px' }}
              />
              
              <div className="absolute right-2 bottom-2 flex gap-2">
                {isLoading && (
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Stop"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="p-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
            
            {messages.length > 0 && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleClearChat}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </div>
        </footer>

        {/* ═══════════════════════════════════════════════════════════
             ⚙️ SETTINGS MODAL
             ═══════════════════════════════════════════════════════════ */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* API Key Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="ollama-xxxxxxxxxxxx"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-violet-500/50 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:ring-2 focus:ring-violet-500/20"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Get your key from{' '}
                    <a 
                      href="https://ollama.com/settings/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300"
                    >
                      ollama.com/settings/keys
                    </a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Model
                  </label>
                  <select
                    value={currentModel}
                    onChange={(e) => setCurrentModel(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-violet-500/50 rounded-xl text-sm text-white outline-none transition-colors focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
                  >
                    <option value="minimax-m2.7:cloud">minimax-m2.7:cloud</option>
                    <option value="llama3.1:cloud">llama3.1:cloud</option>
                    <option value="llama3.1:8b">llama3.1:8b</option>
                    <option value="mistral:7b">mistral:7b</option>
                    <option value="gpt-oss:120b-cloud">gpt-oss:120b-cloud</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-sm font-medium transition-opacity"
                >
                  Save
                </button>
              </div>

              {/* Note */}
              <p className="mt-4 text-xs text-zinc-600 text-center">
                API key is stored locally in your browser and is never sent to our servers.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
