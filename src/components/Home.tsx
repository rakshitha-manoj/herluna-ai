import React, { useState, useEffect } from 'react';
import { useLuna } from '../LunaContext';
import { getPhase, getPhaseColor, Prediction } from '../types';
import { generateInsights, getHabitCorrelations, getPredictions } from '../services/ai';
import { motion } from 'motion/react';
import { Sparkles, Shield, Calendar as CalendarIcon, ChevronRight, Zap, Activity, Brain, AlertCircle, TrendingUp, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { differenceInDays, format, addDays } from 'date-fns';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

import { PredictiveDashboard } from './PredictiveDashboard';
import Simulator from './Simulator';

export const Home: React.FC<{ onLogClick: () => void }> = ({ onLogClick }) => {
  const { profile, logs, predictions, setPredictions, dynamicCycleLength, dynamicPeriodLength, dynamicLastStart } = useLuna();
  const [insights, setInsights] = useState<string[]>([]);
  const [correlations, setCorrelations] = useState<{ habit: string, correlation: string, strength: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  
  const lastStart = dynamicLastStart;
  const cycleLen = dynamicCycleLength;
  const periodLen = dynamicPeriodLength;
  const phase = getPhase(today, lastStart, cycleLen, profile?.activePeriodStart);
  
  const cycleDay = profile?.activePeriodStart 
    ? (differenceInDays(today, new Date(profile.activePeriodStart)) + 1)
    : (differenceInDays(today, lastStart) % cycleLen) + 1;

  const cycleDayLabel = profile?.activePeriodStart ? 'Period Day' : 'Cycle Day';

  // Calculate next period window
  const nextPeriodStart = addDays(lastStart, cycleLen);
  const nextPeriodEnd = addDays(nextPeriodStart, periodLen - 1);
  const nextWindowStr = `${format(nextPeriodStart, 'MMM d')} — ${format(nextPeriodEnd, 'd')}`;

  const confidence = logs.length < 3 ? 'Low' : logs.length < 10 ? 'Moderate' : 'High';
  const confidenceDesc = logs.length < 3 ? 'More logs needed' : 'Based on patterns';

  const refreshPredictions = async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      const preds = await getPredictions(profile, logs, phase);
      setPredictions(preds);
    } catch (error) {
      console.error("Refresh Error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (!profile) return;
      
      try {
        // Only fetch predictions if we don't have any yet
        if (predictions.length === 0) {
          const [ins, corr, preds] = await Promise.all([
            generateInsights(profile, logs, phase),
            getHabitCorrelations(logs),
            getPredictions(profile, logs, phase)
          ]);
          setInsights(ins);
          setCorrelations(corr);
          setPredictions(preds);
        } else {
          const [ins, corr] = await Promise.all([
            generateInsights(profile, logs, phase),
            getHabitCorrelations(logs)
          ]);
          setInsights(ins);
          setCorrelations(corr);
        }
      } catch (error) {
        console.error("Home Init Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [profile?.id, logs.length]); // Only refresh if profile changes or log count changes

  const chartData = React.useMemo(() => {
    const periodStarts = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => new Date(l.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const distinctStarts: { start: Date }[] = [];
    if (periodStarts.length > 0) {
      let currentStart = periodStarts[0];
      for (let i = 1; i < periodStarts.length; i++) {
        const diff = (periodStarts[i].getTime() - periodStarts[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) { 
          distinctStarts.push({ start: currentStart });
          currentStart = periodStarts[i];
        }
      }
      distinctStarts.push({ start: currentStart });
    }

    const history = [];
    for (let i = 1; i < distinctStarts.length; i++) {
        const cycleDiff = (distinctStarts[i].start.getTime() - distinctStarts[i-1].start.getTime()) / (1000 * 60 * 60 * 24);
        history.push({ day: i, val: Math.round(cycleDiff) });
    }
    
    if (history.length < 2) return [
      { day: 1, val: profile?.cycleLength || 28 },
      { day: 2, val: profile?.cycleLength || 28 },
      { day: 3, val: profile?.cycleLength || 28 }
    ];

    return history.slice(-6);
  }, [logs, profile]);

  return (
    <div className="space-y-6 pb-24">
      <header className="px-4 pt-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-widest opacity-50 font-medium">Today's Observation</p>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl text-luna-purple">{phase} Phase</h1>
          <button 
            onClick={refreshPredictions}
            disabled={refreshing}
            className={`w-10 h-10 rounded-full bg-luna-purple/5 flex items-center justify-center text-luna-purple transition-all ${refreshing ? 'animate-spin opacity-50' : 'hover:bg-luna-purple/10'}`}
          >
            {refreshing ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {profile?.activePeriodStart && (
        <section className="px-4">
          <div className="bg-rose-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Period Active — Day {cycleDay}</span>
            </div>
            <Sparkles className="w-4 h-4 opacity-50" />
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="bg-luna-purple text-white rounded-luna p-8 relative overflow-hidden shadow-2xl shadow-luna-purple/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">{cycleDayLabel}</p>
                <h2 className="text-8xl font-sans font-bold leading-none tracking-tighter">{cycleDay}</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20">
                <span className="text-[10px] font-bold uppercase tracking-widest">{phase}</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
              <p className="text-sm leading-relaxed font-medium">
                {insights[0] || "Analyzing your patterns..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Predictions Section */}
      <section className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-luna-purple" />
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">Predictive Intelligence</h3>
          </div>
          <span className="text-[8px] font-sans uppercase tracking-widest opacity-30">7-Day Forecast</span>
        </div>
        
        <PredictiveDashboard predictions={predictions} refreshing={refreshing} />
      </section>

      <section className="px-4 grid grid-cols-2 gap-4">
        <div className="luna-card p-5 space-y-3">
          <div className="flex items-center gap-2 opacity-50">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Confidence</span>
          </div>
          <div>
            <h3 className="text-xl font-sans text-luna-purple">{confidence}</h3>
            <p className="text-xs opacity-50">{confidenceDesc}</p>
          </div>
        </div>
        <div className="luna-card p-5 space-y-3">
          <div className="flex items-center gap-2 opacity-50">
            <CalendarIcon className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Next Window</span>
          </div>
          <div>
            <h3 className="text-xl font-sans text-luna-purple">{nextWindowStr}</h3>
            <p className="text-xs opacity-50">Est. window</p>
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-luna-purple" />
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">Habit Correlations</h3>
            </div>
            <Sparkles className="w-4 h-4 text-luna-purple opacity-30" />
          </div>
          
          <div className="space-y-4">
            {correlations.map((corr, i) => (
              <div key={i} className="p-4 bg-black/5 rounded-2xl border border-black/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-luna-purple">{corr.habit}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    corr.strength === 'High' ? 'bg-emerald-100 text-emerald-700' : 
                    corr.strength === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {corr.strength} Strength
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-70">{corr.correlation}</p>
              </div>
            ))}
            {correlations.length === 0 && (
              <div className="py-8 text-center opacity-40">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-[10px] uppercase tracking-widest">Collecting data for AI correlation...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4">
        <Simulator />
      </section>

      <section className="px-4">
        <div className="bg-luna-teal/20 border border-luna-teal/10 rounded-luna p-6 space-y-4">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 text-teal-900">Expectation</p>
          <p className="text-sm leading-relaxed text-teal-900/80">
            {insights[1] || (logs.length === 0 
              ? "Start logging your daily signals to receive personalized expectations and cycle insights."
              : "Analyzing your recent logs to refine your cycle expectations...")}
          </p>
        </div>
      </section>

      <section className="px-4">
        <button 
          onClick={onLogClick}
          className="luna-button-primary w-full py-6 flex items-center justify-center gap-3 shadow-lg shadow-luna-purple/20"
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-lg">Log Today's Signals</span>
        </button>
      </section>

      <section className="px-4">
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl">Cycle Regularity</h3>
            <span className="text-[10px] bg-black/5 px-2 py-1 rounded-full opacity-50 font-bold uppercase tracking-wider">3 Mo Trend</span>
          </div>
          {logs.length > 0 ? (
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line 
                    type="monotone" 
                    dataKey="val" 
                    stroke="#5D4063" 
                    strokeWidth={3} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 w-full flex flex-col items-center justify-center bg-black/5 rounded-2xl border border-dashed border-black/10">
              <CalendarIcon className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs opacity-40">No historical data yet</p>
            </div>
          )}
          <p className="text-sm italic opacity-60">
            {logs.length === 0 
              ? "HerLuna will identify trends in your cycle regularity as you add more logs."
              : `Insight: Your cycle length is currently averaging ${Math.round(chartData.reduce((s,d)=>s+d.val,0)/chartData.length)} days.`}
          </p>
        </div>
      </section>
    </div>
  );
};
