import React, { useState, useRef, useEffect } from 'react';
import { useLuna } from '../LunaContext';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User, Bot, Loader2, Info, Brain, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getPhase, ChatMessage } from '../types';
import { askAssistant } from '../services/ai';

const CycleInsight: React.FC<{ profile: any, logs: any[] }> = ({ profile, logs }) => {
  const today = new Date();
  const lastStart = new Date(profile?.lastPeriodStart || today);
  const cycleLen = profile?.cycleLength || 28;
  const phase = getPhase(today, lastStart, cycleLen, profile?.activePeriodStart);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-luna-purple/5 border border-luna-purple/10 rounded-[32px] p-8 space-y-4 mb-12"
    >
      <div className="flex items-center gap-2 text-luna-purple">
        <Sparkles className="w-4 h-4" />
        <h3 className="font-bold uppercase tracking-widest text-[10px]">Neural Insight</h3>
      </div>
      <h2 className="text-2xl font-serif text-luna-purple">You are currently in your {phase} phase.</h2>
      <p className="text-xs text-luna-purple/60 leading-relaxed">
        {phase === 'Luteal' ? "Progesterone is rising, which can lead to increased introspection and sensitivity. Focus on magnesium-rich foods and restorative movement." : 
         phase === 'Follicular' ? "Estrogen is climbing, boosting your energy and cognitive clarity. This is an ideal time for high-intensity training and complex problem-solving." :
         phase === 'Ovulatory' ? "You are at your hormonal peak. Social confidence and physical energy are maximized. Prioritize vibrant, fresh foods." :
         "Your body is in a state of renewal. Prioritize iron-rich foods, deep rest, and gentle stretching to support your system."}
      </p>
      <div className="pt-2">
        <div className="flex items-center gap-2 text-[9px] font-sans uppercase tracking-widest text-luna-purple font-bold opacity-40">
          <Brain className="w-3 h-3" />
          Based on your last {logs.length} logs
        </div>
      </div>
    </motion.div>
  );
};

export const Chat: React.FC = () => {
  const { profile, logs, chatMessages, addChatMessage } = useLuna();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input.trim();
    if (!userMsg || loading || !profile) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
      timestamp: new Date().toISOString()
    };

    setInput('');
    addChatMessage(userMessage);
    setLoading(true);

    try {
      const botResponse = await askAssistant(userMsg, profile, logs, chatMessages);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botResponse || "I'm sorry, I couldn't process that.",
        timestamp: new Date().toISOString()
      };
      
      addChatMessage(botMessage);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date().toISOString()
      };
      addChatMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "How should I adjust my diet for the Luteal phase?",
    "Why am I feeling more anxious today?",
    "Best workouts for high estrogen days?",
    "How does caffeine affect my cycle?"
  ];

  return (
    <div className="flex flex-col h-screen bg-luna-cream pb-20 overflow-hidden">
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
        </div>
      </header>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {chatMessages.length === 0 && (
          <>
            <CycleInsight profile={profile} logs={logs} />
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

        {chatMessages.map((msg, i) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-luna-purple text-white' 
                  : 'bg-white text-luna-purple border border-black/5'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-luna-purple text-white rounded-tr-none' 
                  : 'bg-white border border-black/5 text-luna-purple rounded-tl-none'
              }`}>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {msg.content}
                </div>
                <div className={`text-[8px] mt-2 opacity-40 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {format(new Date(msg.timestamp), 'HH:mm')}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
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
            onClick={handleSend}
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
