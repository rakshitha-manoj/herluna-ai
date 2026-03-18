import React from 'react';
import { motion } from 'motion/react';
import { Brain, Zap, Activity, Clock, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { Prediction } from '../types';

interface PredictiveDashboardProps {
  predictions: Prediction[];
  refreshing: boolean;
}

export const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({ predictions, refreshing }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Mood': return <Brain className="w-5 h-5" />;
      case 'Symptom': return <Activity className="w-5 h-5" />;
      case 'Energy': return <Zap className="w-5 h-5" />;
      case 'PMS': return <AlertCircle className="w-5 h-5" />;
      case 'Anomaly': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'PCOS': return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case 'Cycle': return <Clock className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getColor = (type: string, value: number = 50) => {
    if (type === 'Energy') return 'bg-amber-400';
    if (type === 'Mood') return 'bg-indigo-400';
    if (type === 'Symptom') return 'bg-rose-400';
    if (type === 'Cycle') return 'bg-emerald-400';
    if (type === 'PCOS') return 'bg-fuchsia-400';
    if (type === 'PMS') return 'bg-orange-400';
    return 'bg-luna-purple';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Moderate': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  if (refreshing) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-white/50 backdrop-blur-sm rounded-[32px] border border-black/5 shadow-inner">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-luna-purple/10 border-t-luna-purple rounded-full animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-luna-purple animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-luna-purple">Luna Intelligence</p>
          <p className="text-xs opacity-40">Synthesizing your cycle patterns...</p>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="py-16 text-center bg-white/40 backdrop-blur-sm rounded-[32px] border border-dashed border-black/10">
        <div className="w-16 h-16 bg-luna-purple/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-luna-purple opacity-20" />
        </div>
        <h4 className="text-sm font-bold text-luna-purple mb-1">Intelligence Locked</h4>
        <p className="text-[10px] uppercase tracking-widest opacity-40 px-12 leading-relaxed">Log 3+ days of signals to unlock visual predictive intelligence</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[32px] p-8 border border-white/20 backdrop-blur-md flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Phase Optimization</h4>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-sans font-bold text-luna-purple">72</span>
            <span className="text-lg font-bold text-luna-purple opacity-30">%</span>
          </div>
          <p className="text-[10px] text-luna-purple/60 leading-relaxed max-w-[180px]">
            Your lifestyle is 72% aligned with your current phase.
          </p>
        </div>
        <div className="relative w-20 h-20">
          <svg className="w-full h-full rotate-[-90deg]">
            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-black/5" />
            <motion.circle 
              cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="226.2"
              initial={{ strokeDashoffset: 226.2 }}
              animate={{ strokeDashoffset: 226.2 * (1 - 0.72) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="text-luna-purple"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-luna-purple animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
      {predictions.map((pred, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 hover:shadow-md transition-all group relative overflow-hidden"
        >
          {/* Background Accent */}
          <div className={`absolute top-0 right-0 w-32 h-32 ${getColor(pred.type)} opacity-[0.03] rounded-full -mr-16 -mt-16 blur-2xl group-hover:opacity-[0.05] transition-opacity`} />
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${getColor(pred.type)} bg-opacity-10 text-current shadow-sm`}>
                  {getIcon(pred.type)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-luna-purple">{pred.title}</h4>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter ${getSeverityColor(pred.severity || 'Low')}`}>
                      {pred.severity}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest font-medium">{pred.type} Forecast</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className="text-2xl font-sans font-bold text-luna-purple leading-none">{pred.probability?.replace('%', '')}</span>
                  <span className="text-xs font-bold text-luna-purple opacity-40">%</span>
                </div>
                <p className="text-[8px] opacity-30 uppercase font-bold tracking-tighter">Confidence</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-luna-purple/70 font-medium">
              {pred.description}
            </p>

            {/* Visual Indicator */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-luna-purple/40">
                  <Clock className="w-3 h-3" />
                  {pred.timeframe || 'Next 7 Days'}
                </div>
                <span className="text-[10px] font-sans font-bold text-luna-purple">{pred.value || 50}% Intensity</span>
              </div>
              <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pred.value || 50}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 + i * 0.1 }}
                  className={`h-full rounded-full shadow-sm ${getColor(pred.type, pred.value)}`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      </div>
    </div>
  );
};
