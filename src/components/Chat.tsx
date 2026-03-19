import React, { useState, useRef, useEffect } from 'react';
import { useLuna } from '../LunaContext';
import { motion } from 'motion/react';
import { Send, Sparkles, User, Bot, Loader2, Info, Brain, ChevronRight, Trash2 } from 'lucide-react';
import { getPhase, ChatMessage } from '../types';
import { askAssistant } from '../services/ai';

// Completely self-contained chat with its own local state to avoid any context crashes
export const Chat: React.FC = () => {
  const luna = useLuna();
  const profile = luna?.profile;
  const logs = luna?.logs || [];

  // LOCAL chat state — does NOT rely on LunaContext for messages at all
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load saved chat on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('luna_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (e) {
      console.warn('Failed to load chat history');
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveMessages = (msgs: ChatMessage[]) => {
    try {
      localStorage.setItem('luna_chat', JSON.stringify(msgs));
    } catch (e) {
      console.warn('Failed to save chat');
    }
  };

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input.trim();
    if (!userMsg || loading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userMsg,
      timestamp: new Date().toISOString()
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    saveMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const botResponse = await askAssistant(userMsg, profile, logs, messages);
      const botMessage: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: botResponse || "I'm here to help! Could you rephrase that?",
        timestamp: new Date().toISOString()
      };
      const withBot = [...updated, botMessage];
      setMessages(withBot);
      saveMessages(withBot);
    } catch (error) {
      console.error("Chat send error:", error);
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I hit an error. Please try again!",
        timestamp: new Date().toISOString()
      };
      const withErr = [...updated, errMsg];
      setMessages(withErr);
      saveMessages(withErr);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('luna_chat');
  };

  const phase = (() => {
    try {
      const today = new Date();
      return getPhase(today, luna?.dynamicLastStart || today, luna?.dynamicCycleLength || 28, profile?.activePeriodStart);
    } catch { return 'Follicular'; }
  })();

  const SUGGESTIONS = [
    "How should I adjust my diet today?",
    "Why am I feeling more anxious?",
    "Best workouts for my current phase?",
    "Tell me about PCOS"
  ];

  const formatTime = (ts: string | undefined) => {
    try {
      if (!ts) return '';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="flex flex-col h-full bg-luna-cream overflow-hidden">
      {/* Header — clear button is on left, NOT overlapping the ChatBubble close button (top-right) */}
      <header className="px-6 py-4 bg-white border-b border-black/5 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-luna-purple/5 rounded-full -mr-24 -mt-24 blur-3xl" />
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-luna-purple/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-luna-purple" />
            </div>
            <div>
              <h1 className="text-xl font-serif tracking-tight text-luna-purple">Luna Assistant</h1>
              <div className="flex items-center gap-1.5 text-[9px] font-sans uppercase tracking-widest text-luna-purple/40 font-bold">
                <Brain className="w-3 h-3" />
                Neural Guidance
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={clearHistory}
              className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors mr-12"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-luna-purple/5 border border-luna-purple/10 rounded-[32px] p-8 space-y-4 mb-8"
            >
              <div className="flex items-center gap-2 text-luna-purple">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-bold uppercase tracking-widest text-[10px]">Neural Insight</h3>
              </div>
              <h2 className="text-2xl font-serif text-luna-purple">You are currently in your {phase} phase.</h2>
              <p className="text-xs text-luna-purple/60 leading-relaxed">
                {phase === 'Luteal' ? "Progesterone is rising. Focus on magnesium-rich foods and restorative movement." : 
                 phase === 'Follicular' ? "Estrogen is climbing, boosting energy and cognitive clarity." :
                 phase === 'Ovulatory' ? "Hormonal peak — social confidence and physical energy are maximized." :
                 "Your body is renewing. Prioritize iron-rich foods and gentle stretching."}
              </p>
            </motion.div>

            <div className="space-y-4">
              <p className="text-[9px] font-sans uppercase tracking-widest opacity-30 text-center">Suggested Inquiries</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(s)}
                    className="p-3 bg-white border border-black/5 rounded-xl text-[11px] text-luna-purple font-medium hover:bg-luna-purple/5 transition-all text-left flex items-center justify-between group"
                  >
                    {s}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {messages.map((msg, i) => {
          if (!msg || !msg.content) return null;
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id || `m-${i}`}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  isUser ? 'bg-luna-purple text-white' : 'bg-white text-luna-purple border border-black/5'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isUser ? 'bg-luna-purple text-white rounded-tr-none' : 'bg-white border border-black/5 text-luna-purple rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-[8px] mt-2 opacity-40 ${isUser ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-white text-luna-purple border border-black/5 flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-white border border-black/5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-luna-purple" />
                <span className="text-[11px] font-medium opacity-40 italic">Luna is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-black/5 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your cycle..."
            className="w-full h-12 pl-6 pr-14 bg-luna-cream/30 border border-black/5 rounded-full text-sm outline-none focus:border-luna-purple transition-all"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-1.5 top-1.5 w-9 h-9 bg-luna-purple text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 opacity-30">
          <Info className="w-2.5 h-2.5" />
          <span className="text-[8px] font-sans uppercase tracking-widest">AI can make mistakes. Verify medical info.</span>
        </div>
      </div>
    </div>
  );
};
