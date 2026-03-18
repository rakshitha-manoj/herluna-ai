import React, { useState, useEffect } from 'react';
import { LunaProvider, useLuna } from './LunaContext';
import { Onboarding } from './components/Onboarding';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './components/Home';
import { Calendar } from './components/Calendar';
import { Education } from './components/Education';
import { Insights } from './components/Insights';
import { Settings } from './components/Settings';
import { ChatBubble } from './components/ChatBubble';
import { Home as HomeIcon, Calendar as CalendarIcon, BarChart2, BookOpen, Settings as SettingsIcon, ChevronRight, Lock, Heart } from 'lucide-react';

const AppContent: React.FC = () => {
  const { profile, isInitialized } = useLuna();
  const [showSplash, setShowSplash] = useState(true);
  const [authMode, setAuthMode] = useState<'choice' | 'onboarding' | 'login'>('choice');
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'insights' | 'guidance' | 'settings'>('home');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isInitialized || showSplash) return <SplashScreen />;

  if (!profile) {
    if (authMode === 'choice') {
      return (
        <div className="min-h-screen bg-luna-cream flex flex-col p-8 pt-16 space-y-12 max-w-md mx-auto">
          <div className="flex gap-2 mb-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-luna-purple' : 'bg-black/10'}`} />
            ))}
          </div>

          <div className="w-20 h-20 bg-luna-purple/10 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-luna-purple rounded-full opacity-20 animate-pulse" />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-serif text-luna-purple leading-tight">Actionable Help, Privately Held.</h1>
          </div>

          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 text-luna-purple" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Lifestyle Companion</h3>
                <p className="text-sm opacity-60 leading-relaxed">We don't just track. We provide specific nutrition, movement, and rest protocols.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-luna-purple" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Local-First Trust</h3>
                <p className="text-sm opacity-60 leading-relaxed">Your health profile and logs never leave your phone unless you choose to back them up.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <button 
              onClick={() => setAuthMode('onboarding')}
              className="luna-button-primary w-full py-5 text-lg flex items-center justify-center gap-2"
            >
              I Consent & Understand <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setAuthMode('login')}
              className="w-full py-4 text-luna-purple font-semibold hover:bg-luna-purple/5 rounded-2xl transition-all"
            >
              I already have an account
            </button>
          </div>
        </div>
      );
    }
    if (authMode === 'login') {
      return (
        <div className="min-h-screen bg-luna-cream p-8 flex flex-col">
          <button onClick={() => setAuthMode('choice')} className="mb-12 text-luna-purple font-medium flex items-center gap-2">
            <ChevronRight className="w-5 h-5 rotate-180" /> Back
          </button>
          <div className="space-y-8">
            <h1 className="text-4xl font-serif">Welcome Back</h1>
            <div className="space-y-4">
              <input type="email" placeholder="Email" className="w-full bg-white border-2 border-black/5 rounded-2xl p-4 outline-none focus:border-luna-purple" />
              <input type="password" placeholder="Password" className="w-full bg-white border-2 border-black/5 rounded-2xl p-4 outline-none focus:border-luna-purple" />
              <button 
                onClick={() => {
                  // In a real app, we'd call a login service here.
                  // For this demo, we'll simulate a successful login by setting a dummy profile if none exists,
                  // or just letting the context handle it if the user is already "logged in" via Firebase.
                  // Since we want to redirect to Home, and activeTab defaults to 'home', we just need to ensure
                  // the profile is loaded.
                  window.location.reload(); // Simple way to trigger re-init if needed, or just set a flag
                }}
                className="luna-button-primary w-full py-4"
              >
                Login
              </button>
            </div>
            <p className="text-center text-xs opacity-40">HerLuna uses secure biometric or email-based authentication to protect your health data.</p>
          </div>
        </div>
      );
    }
    return <Onboarding onBack={() => setAuthMode('choice')} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home onLogClick={() => setActiveTab('calendar')} />;
      case 'calendar': return <Calendar />;
      case 'insights': return <Insights />;
      case 'guidance': return <Education />;
      case 'settings': return <Settings />;
    }
  };

  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'calendar', icon: <CalendarIcon />, label: 'Calendar' },
    { id: 'insights', icon: <BarChart2 />, label: 'Insights' },
    { id: 'guidance', icon: <BookOpen />, label: 'Guidance' },
    { id: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-luna-cream max-w-md mx-auto relative shadow-2xl">
      <main className="min-h-screen">
        {renderContent()}
      </main>

      <ChatBubble />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-black/5 px-4 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-luna-purple' : 'text-black/30'
            }`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === item.id ? 'bg-luna-purple/10' : ''}`}>
              {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <LunaProvider>
      <AppContent />
    </LunaProvider>
  );
}

