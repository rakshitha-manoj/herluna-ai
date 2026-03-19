import React, { useState, useEffect } from 'react';
import { useLuna } from '../LunaContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, addDays, isWithinInterval, startOfDay, isToday, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, X, Plus, Info, Calendar as CalendarIcon } from 'lucide-react';
import { DailyLog, SYMPTOM_OPTIONS, MOOD_OPTIONS, FLOW_LEVELS, Symptom } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const Calendar: React.FC = () => {
  const { profile, logs, addLog, startPeriod, endPeriod, dynamicCycleLength, dynamicPeriodLength, dynamicLastStart } = useLuna();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  // 3. GENERATE PREDICTIONS
  // If today is far from dynamicLastStart, index 0 should be the CURRENT predicted cycle, not just next.
  const predictions = Array.from({ length: 6 }).map((_, i) => {
    const today = new Date();
    const daysSinceLast = differenceInDays(today, dynamicLastStart);
    
    // If it's been more than a full cycle since last start, we need to shift the first prediction to "now"
    const offset = Math.floor(daysSinceLast / dynamicCycleLength);
    const start = addDays(dynamicLastStart, (i + Math.max(0, offset)) * dynamicCycleLength);
    const end = addDays(start, dynamicPeriodLength - 1);
    
    const ovulationDay = addDays(start, -14);
    const ovulationStart = addDays(ovulationDay, -4);
    const ovulationEnd = ovulationDay;
    
    return { start, end, ovulationStart, ovulationEnd };
  });

  const isPredictedPeriod = (date: Date) => {
    return predictions.some(p => isWithinInterval(startOfDay(date), { start: startOfDay(p.start), end: startOfDay(p.end) }));
  };

  const isOvulationWindow = (date: Date) => {
    return predictions.some(p => isWithinInterval(startOfDay(date), { start: startOfDay(p.ovulationStart), end: startOfDay(p.ovulationEnd) }));
  };

  const isLogged = (date: Date) => {
    return logs.find(log => isSameDay(new Date(log.date), date));
  };

  // 4. Calculate Cycle Variability and Next Predicted Target
  const cycleStats = React.useMemo(() => {
    const periodStarts = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => new Date(l.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const distinctStarts: Date[] = [];
    if (periodStarts.length > 0) {
      let currentStart = periodStarts[0];
      distinctStarts.push(currentStart);
      for (let i = 1; i < periodStarts.length; i++) {
        const diff = (periodStarts[i].getTime() - periodStarts[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) { 
          currentStart = periodStarts[i];
          distinctStarts.push(currentStart);
        }
      }
    }

    const intervals: number[] = [];
    for (let i = 1; i < distinctStarts.length; i++) {
      intervals.push((distinctStarts[i].getTime() - distinctStarts[i-1].getTime()) / (1000 * 60 * 60 * 24));
    }

    const avg = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : dynamicCycleLength;
    const variancy = intervals.length > 0 ? Math.sqrt(intervals.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / intervals.length) : 0;
    
    // Find absolute next prediction (the one that hasn't started yet)
    const nextTarget = predictions.find(p => p.start > new Date()) || predictions[0];

    const confidence = logs.length < 7 ? 'Early Stage' : logs.length < 20 ? 'Learning' : logs.length < 40 ? 'Calibrated' : 'High Precision';

    return {
      isIrregular: variancy > 3 || (intervals.length > 1 && Math.abs(Math.max(...intervals) - Math.min(...intervals)) > 7),
      variancy,
      nextTarget,
      confidence
    };
  }, [logs, predictions, dynamicCycleLength]);

  const isActualPeriod = (date: Date) => {
    const d = startOfDay(date);
    
    // 1. Check if there's a log with flow on this day
    const log = logs.find(l => isSameDay(new Date(l.date), d));
    if (log && log.flow && log.flow !== 'None') return true;

    // 2. Check active period (currently ongoing)
    if (profile?.activePeriodStart) {
      const activeStart = startOfDay(new Date(profile.activePeriodStart));
      const today = startOfDay(new Date());
      const predictedEnd = addDays(activeStart, dynamicPeriodLength - 1);
      
      // If today is within the predicted window of the active start, highlight it
      if (isWithinInterval(d, { start: activeStart, end: max([today, predictedEnd]) })) return true;
    }

    // 3. Project windows from ALL distinct period starts found in logs
    // This ensures that if you log a start, the next 4-5 days (periodLength) stay highlighted automatically
    const periodStarts = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => new Date(l.date))
      .sort((a,b) => a.getTime() - b.getTime());

    const distinctStarts: Date[] = [];
    if (periodStarts.length > 0) {
      let currentStart = periodStarts[0];
      distinctStarts.push(currentStart);
      for (let i = 1; i < periodStarts.length; i++) {
        const diff = (periodStarts[i].getTime() - periodStarts[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) { 
          currentStart = periodStarts[i];
          distinctStarts.push(currentStart);
        }
      }
    }

    return distinctStarts.find(start => {
      const windowStart = startOfDay(start);
      const windowEnd = addDays(windowStart, dynamicPeriodLength - 1);
      
      // If the date is within the window, check if there's any 'None' log between start and d
      if (isWithinInterval(d, { start: windowStart, end: windowEnd })) {
        const hasEndLog = logs.some(l => {
          const logDate = startOfDay(new Date(l.date));
          return isAfter(logDate, windowStart) && (isBefore(logDate, d) || isSameDay(logDate, d)) && l.flow === 'None';
        });
        return !hasEndLog;
      }
      return false;
    }) !== undefined;
  };

  const isAfter = (a: Date, b: Date) => a.getTime() > b.getTime();
  const isBefore = (a: Date, b: Date) => a.getTime() < b.getTime();

  const max = (dates: Date[]) => new Date(Math.max(...dates.map(d => d.getTime())));

  const handlePeriodToggle = () => {
    if (profile?.activePeriodStart) {
      endPeriod(new Date());
    } else {
      startPeriod(new Date());
    }
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-luna-cream pb-32">
      <header className="px-8 pt-12 pb-8">
        <h1 className="text-4xl font-serif text-luna-purple">Cycle Journal</h1>
        <p className="text-sm opacity-50 mt-1">Log past symptoms for AI analysis</p>
      </header>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Calendar Card */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-luna-purple" />
            </button>
            <h2 className="text-xl font-serif text-luna-purple">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-luna-purple" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-sans font-bold opacity-30 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2">
            {days.map((day, i) => {
              const logEntry = logs.find(l => isSameDay(new Date(l.date), day));
              const period = (logEntry?.flow && logEntry.flow !== 'None') || isActualPeriod(day);
              const predicted = isPredictedPeriod(day);
              const ovulation = isOvulationWindow(day);
              const isTodayDate = isToday(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isFuture = day > today;

              const flowLevel = logEntry?.flow;
              const flowColor = flowLevel === 'Heavy' ? 'bg-rose-300' : flowLevel === 'Medium' ? 'bg-rose-200' : flowLevel === 'Light' ? 'bg-rose-100' : 'bg-rose-100';

              return (
                <button
                  key={i}
                  disabled={isFuture}
                  onClick={() => {
                    setSelectedDate(day);
                    if (!logEntry) {
                      setShowLogModal(true);
                    }
                  }}
                  className={`
                    aspect-square flex flex-col items-center justify-center transition-all relative
                    ${!isCurrentMonth ? 'opacity-10' : ''}
                    ${isFuture ? 'cursor-default' : 'hover:bg-black/5 rounded-full'}
                  `}
                >
                  <div className={`
                    w-10 h-10 flex items-center justify-center rounded-full text-sm font-sans transition-all
                    ${isTodayDate ? 'ring-2 ring-luna-purple ring-offset-2' : ''}
                    ${period ? `${flowColor} text-rose-900 font-bold border-2 border-rose-400` : ''}
                    ${predicted && !period ? 'bg-rose-50/50 border-2 border-dashed border-rose-300 text-rose-400' : ''}
                    ${ovulation && !period ? 'border-2 border-amber-400 bg-amber-50/50 shadow-sm' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  {ovulation && !period && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 shadow-sm border border-white" />
                  )}
                  {logEntry && !period && !ovulation && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-luna-purple/40" />
                  )}
                  {logEntry?.flow && logEntry.flow !== 'None' && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 pt-6 border-t border-black/5 flex flex-wrap gap-x-6 gap-y-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-2 h-2 rounded-sm bg-rose-100" />
                <div className="w-2 h-2 rounded-sm bg-rose-200" />
                <div className="w-2 h-2 rounded-sm bg-rose-300" />
              </div>
              <span className="text-[9px] font-sans uppercase tracking-widest opacity-50">Flow Intensity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-50/50 border-2 border-dashed border-rose-300" />
              <span className="text-[9px] font-sans uppercase tracking-widest opacity-50">Predicted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-50/50 border-2 border-amber-400 relative">
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 border border-white" />
              </div>
              <span className="text-[9px] font-sans uppercase tracking-widest opacity-50">Fertile Window</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-luna-purple/40" />
              <span className="text-[9px] font-sans uppercase tracking-widest opacity-50">Logged Day</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 space-y-4">
          <div className="flex items-center gap-2 text-luna-purple">
            <Sparkles className="w-4 h-4" />
            <h3 className="font-bold uppercase tracking-widest text-[10px]">Cycle Intelligence</h3>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-serif text-luna-purple">
              {format(cycleStats.nextTarget.start, 'MMM d')} — {format(cycleStats.nextTarget.end, 'd')}
            </h2>
            <p className="text-xs opacity-40">
              Insight: {cycleStats.isIrregular 
                ? "Cycle variability detected. AI is adapting to your irregularities." 
                : "No significant deviations detected in your patterns."}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 space-y-4">
          <h3 className="text-xl font-serif text-luna-purple">Cycle History</h3>
          <div className="space-y-2">
            <p className="text-sm font-bold text-luna-purple/60">Confidence Level: {cycleStats.confidence}</p>
            <p className="text-sm opacity-40 leading-relaxed">
              {logs.length > 40 
                ? "Your data volume is excellent. Predictions are highly optimized." 
                : "Continue logging to further refine cycle predictions."}
            </p>
          </div>
        </div>

        {/* Selected Date Overview */}
        <AnimatePresence mode="wait">
          {selectedDate && isLogged(selectedDate) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 space-y-6"
            >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif text-luna-purple">Signals for {format(selectedDate, 'MMMM d')}</h3>
                    <p className="text-[10px] font-sans uppercase tracking-widest opacity-40">Daily Overview</p>
                  </div>
                  <button 
                    onClick={() => setShowLogModal(true)} 
                    className="px-4 py-2 bg-luna-purple text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-luna-purple/20"
                  >
                    Edit Log
                  </button>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-luna-cream/30 rounded-2xl space-y-1">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Mood</p>
                  <p className="text-sm font-medium text-luna-purple">{isLogged(selectedDate)?.mood}</p>
                </div>
                <div className="p-4 bg-luna-cream/30 rounded-2xl space-y-1">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Energy</p>
                  <p className="text-sm font-medium text-luna-purple">{isLogged(selectedDate)?.energy}/10</p>
                </div>
                <div className="p-4 bg-luna-cream/30 rounded-2xl space-y-1">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Flow</p>
                  <p className="text-sm font-medium text-luna-purple">{isLogged(selectedDate)?.flow}</p>
                </div>
                <div className="p-4 bg-luna-cream/30 rounded-2xl space-y-1">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Sleep</p>
                  <p className="text-sm font-medium text-luna-purple">{isLogged(selectedDate)?.sleep}h</p>
                </div>
              </div>

              {isLogged(selectedDate)?.symptoms && isLogged(selectedDate)!.symptoms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {isLogged(selectedDate)!.symptoms.map(s => (
                      <span key={s.id} className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 ${
                        s.severity === 3 ? 'bg-rose-100 text-rose-700' : 
                        s.severity === 2 ? 'bg-amber-100 text-amber-700' : 'bg-luna-purple/5 text-luna-purple'
                      }`}>
                        {s.name}
                        <span className="opacity-50">
                          {s.severity === 3 ? '!!!' : s.severity === 2 ? '!!' : '!'}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isLogged(selectedDate)?.journal && (
                <div className="space-y-2">
                  <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Journal</p>
                  <p className="text-xs text-luna-purple/70 italic leading-relaxed">"{isLogged(selectedDate)?.journal}"</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4">
          <button 
            onClick={handlePeriodToggle}
            className={`w-full h-16 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-xl ${
              profile?.activePeriodStart 
                ? 'bg-rose-600 text-white shadow-rose-600/20' 
                : 'bg-luna-purple text-white shadow-luna-purple/20'
            }`}
          >
            {profile?.activePeriodStart ? 'End Active Period' : 'Log Period Start'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedDate && showLogModal && (
          <LogModal 
            date={selectedDate} 
            isPredictedFlow={isOvulationWindow(selectedDate)}
            isWithinPeriod={isActualPeriod(selectedDate)}
            onClose={() => setShowLogModal(false)}
            onSave={(log) => {
              addLog(log);
              setShowLogModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const LogModal: React.FC<{ 
  date: Date; 
  isPredictedFlow?: boolean;
  isWithinPeriod?: boolean;
  onClose: () => void; 
  onSave: (log: DailyLog) => void 
}> = ({ date, isPredictedFlow, isWithinPeriod, onClose, onSave }) => {
  const { logs, profile, endPeriod, addLog } = useLuna();
  const existingLog = logs.find(l => isSameDay(new Date(l.date), date));

  const isBefore = (a: Date, b: Date) => a.getTime() < b.getTime();
  const isSameDayDate = (a: Date, b: Date) => isSameDay(a, b);
  
  const isPeriodActive = profile?.activePeriodStart && isWithinInterval(startOfDay(date), {
    start: startOfDay(new Date(profile.activePeriodStart)),
    end: startOfDay(new Date())
  });

  const [symptoms, setSymptoms] = useState<Symptom[]>(existingLog?.symptoms || []);
  const [mood, setMood] = useState(existingLog?.mood || 'Stable');
  const [energy, setEnergy] = useState(existingLog?.energy || 5);
  const [stress, setStress] = useState(existingLog?.stress || 5);
  const [sleep, setSleep] = useState(existingLog?.sleep || 8);
  const [hydration, setHydration] = useState(existingLog?.hydration || 8);
  const [diet, setDiet] = useState(existingLog?.diet || 'Balanced');
  const [journal, setJournal] = useState(existingLog?.journal || '');
  const [flow, setFlow] = useState<'None' | 'Light' | 'Medium' | 'Heavy'>(existingLog?.flow || (isPeriodActive || isPredictedFlow ? 'Medium' : 'None'));
  const [hasFlow, setHasFlow] = useState(flow !== 'None');
  const [notes, setNotes] = useState(existingLog?.notes || '');

  const DIET_OPTIONS = ['Balanced', 'High Protein', 'Low Carb', 'Plant Based', 'Fast Food', 'Irregular'];

  const handleSave = () => {
    onSave({
      date: date.toISOString(),
      symptoms,
      mood,
      energy,
      stress,
      sleep,
      exercise: false,
      hydration,
      diet,
      journal,
      flow,
      notes
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-luna-purple/20 backdrop-blur-xl z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-[40px] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h2 className="text-3xl font-serif text-luna-purple">{format(date, 'MMMM d')}</h2>
            <p className="text-[10px] font-sans uppercase tracking-[0.2em] opacity-40">Wellness Log</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-luna-purple/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Flow Section */}
          <div className={`space-y-6 p-6 rounded-[32px] transition-all ${hasFlow ? 'bg-rose-50 border border-rose-100' : 'bg-luna-cream/50'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="period-toggle"
                  checked={hasFlow} 
                  onChange={(e) => {
                    setHasFlow(e.target.checked);
                    if (!e.target.checked) {
                      setFlow('None');
                    } else if (flow === 'None') {
                      setFlow('Medium');
                    }
                  }}
                  className="w-5 h-5 rounded border-black/10 text-luna-purple focus:ring-luna-purple accent-luna-purple"
                />
                <label htmlFor="period-toggle" className="text-[10px] font-sans uppercase tracking-widest text-luna-purple font-bold cursor-pointer">I'm on my period</label>
              </div>
              
              {(profile?.activePeriodStart || isWithinPeriod) && (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    // If no active start, try to find the logical start for this window
                    let targetStart = profile?.activePeriodStart;
                    if (!targetStart) {
                      const periodStarts = logs
                        .filter(l => l.flow && l.flow !== 'None')
                        .map(l => new Date(l.date))
                        .sort((a,b) => b.getTime() - a.getTime());
                      
                      const nearestStart = periodStarts.find(s => isBefore(s, date) || isSameDayDate(s, date));
                      if (nearestStart) targetStart = nearestStart.toISOString();
                    }

                    if (targetStart) {
                      await endPeriod(date);
                      // Force a "None" log for tomorrow to explicitly terminate the window projection
                      const tomorrow = addDays(date, 1);
                      addLog({
                        date: tomorrow.toISOString().split('T')[0],
                        flow: 'None',
                        symptoms: [],
                        mood: 'Stable',
                        energy: 5,
                        stress: 5,
                        sleep: 8,
                        exercise: false,
                        hydration: 8,
                        diet: 'Balanced',
                        journal: 'Period ended.',
                        notes: ''
                      });
                    }
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 shrink-0"
                >
                  End Period Today
                </button>
              )}
            </div>
            
            {hasFlow && (
              <div className="space-y-4">
                <p className="text-[10px] font-sans opacity-40 uppercase tracking-widest">Select Flow Intensity</p>
                <div className="flex gap-2">
                  {FLOW_LEVELS.filter(f => f !== 'None').map(f => (
                    <button
                      key={f}
                      onClick={() => setFlow(f as any)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-sans font-bold uppercase tracking-widest transition-all border ${
                        flow === f 
                          ? 'bg-luna-purple text-white border-luna-purple shadow-lg shadow-luna-purple/20' 
                          : 'bg-white text-luna-purple border-black/5 hover:border-luna-purple/20'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Symptoms Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold opacity-50">Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map(s => {
                const active = symptoms.find(sym => sym.name === s);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (active) {
                        setSymptoms(symptoms.filter(sym => sym.name !== s));
                      } else {
                        setSymptoms([...symptoms, { id: Math.random().toString(), name: s, severity: 1 }]);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                      active 
                        ? 'bg-luna-purple text-white border-luna-purple shadow-md shadow-luna-purple/10' 
                        : 'bg-white text-luna-purple border-black/5 hover:border-luna-purple/20'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            
            {symptoms.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-black/5">
                <p className="text-[9px] font-sans uppercase tracking-widest opacity-40">Adjust Severity</p>
                {symptoms.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-luna-cream/30 rounded-2xl">
                    <span className="text-xs font-bold text-luna-purple">{s.name}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(sev => (
                        <button
                          key={sev}
                          onClick={() => setSymptoms(symptoms.map(sym => sym.id === s.id ? { ...sym, severity: sev as 1|2|3 } : sym))}
                          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                            s.severity === sev 
                              ? 'bg-luna-purple text-white' 
                              : 'bg-white text-luna-purple border border-black/5'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mood Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold opacity-50">Mood</h3>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    mood === m 
                      ? 'bg-luna-purple text-white border-luna-purple shadow-md shadow-luna-purple/10' 
                      : 'bg-white text-luna-purple border-black/5 hover:border-luna-purple/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Habit Sliders */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold opacity-50">Daily Vitals</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="opacity-40">Energy Level</span>
                    <span className="text-luna-purple">{energy}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={energy} onChange={(e) => setEnergy(parseInt(e.target.value))} className="w-full h-1.5 bg-luna-cream rounded-lg appearance-none cursor-pointer accent-luna-purple" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="opacity-40">Stress Level</span>
                    <span className="text-luna-purple">{stress}/10</span>
                  </div>
                  <input type="range" min="1" max="10" value={stress} onChange={(e) => setStress(parseInt(e.target.value))} className="w-full h-1.5 bg-luna-cream rounded-lg appearance-none cursor-pointer accent-luna-purple" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="opacity-40">Sleep (Hours)</span>
                    <span className="text-luna-purple">{sleep}h</span>
                  </div>
                  <input type="range" min="1" max="12" step="0.5" value={sleep} onChange={(e) => setSleep(parseFloat(e.target.value))} className="w-full h-1.5 bg-luna-cream rounded-lg appearance-none cursor-pointer accent-luna-purple" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="opacity-40">Hydration (Glasses)</span>
                    <span className="text-luna-purple">{hydration}</span>
                  </div>
                  <input type="range" min="0" max="15" step="1" value={hydration} onChange={(e) => setHydration(parseInt(e.target.value))} className="w-full h-1.5 bg-luna-cream rounded-lg appearance-none cursor-pointer accent-luna-purple" />
                </div>
              </div>
            </div>
          </div>

          {/* Journal Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold opacity-50">Journal Reflection</h3>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="How are you feeling today?"
              className="w-full bg-luna-cream/50 border border-black/5 rounded-3xl p-6 text-sm outline-none focus:border-luna-purple/20 min-h-[120px] resize-none"
            />
          </div>
        </div>

        <div className="p-8 border-t border-black/5 shrink-0 bg-white">
          <button 
            onClick={handleSave}
            className="luna-button-primary w-full py-5 shadow-xl shadow-luna-purple/20"
          >
            Save Daily Log
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
