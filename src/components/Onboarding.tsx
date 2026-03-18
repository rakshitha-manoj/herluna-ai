import React, { useState } from 'react';
import { useLuna } from '../LunaContext';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check, User, Mail, Lock, Activity, Database, Calendar as CalendarIcon, Heart, Sparkles, Zap, Trophy, Dumbbell, Footprints } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface OnboardingProps {
  onBack: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onBack }) => {
  const { setProfile } = useLuna();
  const [step, setStep] = useState(0);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    password: '',
    ageGroup: '19-25',
    activityLevel: 'Moderately Active',
    isIrregular: false,
    storageMode: 'Local',
    cycleLength: 28,
    periodLength: 5,
    lastPeriodStart: '',
  });

  const next = () => setStep(s => s + 1);
  const prev = () => {
    if (step === 0) onBack();
    else setStep(s => s - 1);
  };

  const finish = () => {
    const finalData = { ...data };
    if (data.lastPeriodStart && data.lastPeriodEnd) {
      const start = new Date(data.lastPeriodStart);
      const end = new Date(data.lastPeriodEnd);
      finalData.periodLength = Math.max(1, differenceInDays(end, start) + 1);
    }
    setProfile(finalData as UserProfile);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidName = (name: string) => /^[a-zA-Z\s]+$/.test(name.trim());
  
  const getNameError = () => {
    if (!data.name) return null;
    if (!isValidName(data.name)) return "Name should only contain letters and spaces";
    return null;
  };

  const getEmailError = () => {
    if (!data.email) return null;
    if (!isValidEmail(data.email)) return "Please enter a valid email address";
    return null;
  };

  const getPasswordError = () => {
    if (!data.password) return null;
    if (data.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const isStep1Valid = data.name && isValidName(data.name) && 
                       data.email && isValidEmail(data.email) && 
                       data.password && data.password.length >= 6;

  const handleDateClick = (dateStr: string) => {
    if (!data.lastPeriodStart || (data.lastPeriodStart && data.lastPeriodEnd)) {
      setData({ ...data, lastPeriodStart: dateStr, lastPeriodEnd: undefined });
    } else {
      const start = new Date(data.lastPeriodStart);
      const end = new Date(dateStr);
      if (end < start) {
        setData({ ...data, lastPeriodStart: dateStr, lastPeriodEnd: data.lastPeriodStart });
      } else {
        setData({ ...data, lastPeriodEnd: dateStr });
      }
    }
  };

  const isInRange = (dateStr: string) => {
    if (!data.lastPeriodStart || !data.lastPeriodEnd) return false;
    const date = new Date(dateStr);
    const start = new Date(data.lastPeriodStart);
    const end = new Date(data.lastPeriodEnd);
    return date > start && date < end;
  };

  const steps = [
    // Step 1: Basic Info
    <div key="0" className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif">Tell us about you</h1>
          <p className="opacity-60">Let's personalize your experience.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold opacity-50 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className={`w-full bg-white border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                  getNameError() ? 'border-rose-500/50 focus:border-rose-500' : 'border-black/5 focus:border-luna-purple'
                }`}
                placeholder="Jane Doe"
              />
            </div>
            {getNameError() && <p className="text-[10px] text-rose-500 ml-1 font-medium">{getNameError()}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold opacity-50 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className={`w-full bg-white border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                  getEmailError() ? 'border-rose-500/50 focus:border-rose-500' : 'border-black/5 focus:border-luna-purple'
                }`}
                placeholder="jane@example.com"
              />
            </div>
            {getEmailError() && <p className="text-[10px] text-rose-500 ml-1 font-medium">{getEmailError()}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold opacity-50 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
              <input
                type="password"
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className={`w-full bg-white border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                  getPasswordError() ? 'border-rose-500/50 focus:border-rose-500' : 'border-black/5 focus:border-luna-purple'
                }`}
                placeholder="••••••••"
              />
            </div>
            {getPasswordError() && <p className="text-[10px] text-rose-500 ml-1 font-medium">{getPasswordError()}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold opacity-50 ml-1">Age Group</label>
            <div className="grid grid-cols-3 gap-2">
              {['13-18', '19-25', '26-35', '36-45', '46+'].map((age) => (
                <button
                  key={age}
                  onClick={() => setData({ ...data, ageGroup: age as any })}
                  className={`py-3 rounded-xl border-2 transition-all ${
                    data.ageGroup === age ? 'border-luna-purple bg-luna-purple/5 text-luna-purple' : 'border-black/5 bg-white opacity-60'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-6 bg-luna-cream border-t border-black/5 flex gap-3">
        <button onClick={prev} className="flex-1 py-4 rounded-2xl border-2 border-black/5 font-semibold">Back</button>
        <button 
          onClick={next} 
          disabled={!isStep1Valid}
          className="flex-[2] luna-button-primary disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>,

    // Step 2: Activity Level
    <div key="activity" className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif">Your Energy</h1>
          <p className="opacity-60">How active is your typical day?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'Sedentary', desc: 'Mostly sitting (Desk work)', icon: <User className="w-5 h-5" /> },
            { id: 'Lightly Active', desc: 'Casual walking, light movement', icon: <Footprints className="w-5 h-5" /> },
            { id: 'Moderately Active', desc: 'Regular exercise (3-5 days)', icon: <Activity className="w-5 h-5" /> },
            { id: 'Very Active', desc: 'Intense daily activity / Training', icon: <Zap className="w-5 h-5" /> }
          ].map((level) => (
            <button
              key={level.id}
              onClick={() => setData({ ...data, activityLevel: level.id as any })}
              className={`p-4 rounded-2xl border-2 text-left transition-all space-y-2 ${
                data.activityLevel === level.id ? 'border-luna-purple bg-luna-purple/5' : 'border-black/5 bg-white'
              }`}
            >
              <div className={`p-2 rounded-xl w-fit ${data.activityLevel === level.id ? 'bg-luna-purple/10 text-luna-purple' : 'bg-black/5 opacity-40'}`}>
                {level.icon}
              </div>
              <div>
                <div className="font-bold text-sm">{level.id}</div>
                <div className="text-[10px] opacity-50 leading-tight">{level.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-6 bg-luna-cream border-t border-black/5 flex gap-3">
        <button onClick={prev} className="flex-1 py-4 rounded-2xl border-2 border-black/5 font-semibold">Back</button>
        <button onClick={next} className="flex-[2] luna-button-primary">Continue</button>
      </div>
    </div>,

    // Step 3: Storage Mode
    <div key="1" className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 space-y-8 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif">Data Privacy</h1>
          <p className="opacity-60">Where would you like to store your data?</p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'Local', desc: 'On-device only. Maximum privacy, no sync.', icon: <Database className="w-6 h-6" /> },
              { id: 'Cloud', desc: 'Encrypted sync. Access your data from any device.', icon: <Database className="w-6 h-6 text-luna-purple" /> }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setData({ ...data, storageMode: mode.id as any })}
                className={`p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
                  data.storageMode === mode.id ? 'border-luna-purple bg-luna-purple/5' : 'border-black/5 bg-white'
                }`}
              >
                <div className={`p-3 rounded-xl ${data.storageMode === mode.id ? 'bg-luna-purple/10' : 'bg-black/5'}`}>
                  {mode.icon}
                </div>
                <div>
                  <div className="font-bold text-lg">{mode.id} Storage</div>
                  <div className="text-sm opacity-50">{mode.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-6 bg-luna-cream border-t border-black/5 flex gap-3">
        <button onClick={prev} className="flex-1 py-4 rounded-2xl border-2 border-black/5 font-semibold">Back</button>
        <button onClick={next} className="flex-[2] luna-button-primary">Continue</button>
      </div>
    </div>,

    // Step 4: Last Period
    <div key="2" className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif">Your Rhythm</h1>
          <p className="opacity-60 text-sm">Select the start and end of your last period.</p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 p-3 bg-white rounded-2xl border border-black/5">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">Start Date</p>
            <p className="text-sm font-medium">{data.lastPeriodStart ? format(new Date(data.lastPeriodStart), 'MMM d, yyyy') : 'Select...'}</p>
          </div>
          <div className="flex-1 p-3 bg-white rounded-2xl border border-black/5">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1">End Date</p>
            <p className="text-sm font-medium">{data.lastPeriodEnd ? format(new Date(data.lastPeriodEnd), 'MMM d, yyyy') : 'Select...'}</p>
          </div>
        </div>

        <div className="luna-card space-y-4 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-sans font-semibold">{format(viewDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 hover:bg-black/5 rounded-full transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <button 
                onClick={() => {
                  const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                  if (nextMonth <= new Date()) setViewDate(nextMonth);
                }}
                disabled={new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) > new Date()}
                className="p-2 hover:bg-black/5 rounded-full transition-all disabled:opacity-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-bold opacity-30 uppercase tracking-widest mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {(() => {
              const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
              const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
              const daysInMonth = end.getDate();
              const startDay = start.getDay();
              
              const days = [];
              // Padding for start of month
              for (let i = 0; i < startDay; i++) {
                days.push(<div key={`pad-${i}`} className="aspect-square" />);
              }
              
              for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const isFuture = date > new Date();
                const isStart = data.lastPeriodStart === dateStr;
                const isEnd = data.lastPeriodEnd === dateStr;
                const inRange = isInRange(dateStr);
                const hasRange = data.lastPeriodStart && data.lastPeriodEnd;

                days.push(
                  <div 
                    key={i} 
                    className={`relative aspect-square flex items-center justify-center ${
                      hasRange && (isStart || isEnd || inRange) ? 'bg-luna-purple/10' : ''
                    } ${isStart && hasRange ? 'rounded-l-full' : ''} ${isEnd && hasRange ? 'rounded-r-full' : ''}`}
                  >
                    <button
                      disabled={isFuture}
                      onClick={() => handleDateClick(dateStr)}
                      className={`w-full h-full rounded-full flex items-center justify-center text-sm transition-all relative z-10 ${
                        isStart || isEnd
                          ? 'bg-luna-purple text-white shadow-lg shadow-luna-purple/20'
                          : isFuture
                          ? 'opacity-10 cursor-not-allowed'
                          : 'hover:bg-black/5'
                      }`}
                    >
                      {i}
                    </button>
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => setData(d => ({ ...d, isIrregular: !d.isIrregular }))}
            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
              data.isIrregular ? 'border-luna-purple bg-luna-purple/5' : 'border-black/5 bg-white'
            }`}
          >
            <div className="text-left">
              <div className="font-bold text-sm">My periods are irregular</div>
              <div className="text-[10px] opacity-50">I don't have a predictable cycle length</div>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-all ${data.isIrregular ? 'bg-luna-purple' : 'bg-black/10'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.isIrregular ? 'left-5' : 'left-1'}`} />
            </div>
          </button>
        </div>
      </div>
      <div className="px-4 py-6 bg-luna-cream border-t border-black/5 flex gap-3">
        <button onClick={prev} className="flex-1 py-4 rounded-2xl border-2 border-black/5 font-semibold">Back</button>
        <button 
          onClick={finish} 
          disabled={!data.lastPeriodStart}
          className="flex-[2] luna-button-primary disabled:opacity-50"
        >
          Enter HerLuna
        </button>
      </div>
    </div>
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-luna-cream overflow-hidden max-w-md mx-auto">
      <div className="pt-12 pb-6 px-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-luna-purple' : 'bg-black/10'}`} />
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 flex flex-col"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
