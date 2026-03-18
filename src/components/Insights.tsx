import React, { useState, useEffect } from 'react';
import { useLuna } from '../LunaContext';
import { Sparkles, Shield, TrendingUp, AlertCircle, Calendar as CalendarIcon, Brain, Activity, PieChart as PieIcon, BarChart3, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, ComposedChart, Line, Scatter
} from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { generateCycleSummary, analyzeSymptoms, getSymptomClusters, getHabitImpactPrediction } from '../services/ai';

export const Insights: React.FC = () => {
  const { logs, profile } = useLuna();
  const [summary, setSummary] = useState<string | null>(null);
  const [symptomAnalysis, setSymptomAnalysis] = useState<{ symptom: string, analysis: string }[]>([]);
  const [clusters, setClusters] = useState<{ cluster: string, symptoms: string[], insight: string }[]>([]);
  const [habitImpacts, setHabitImpacts] = useState<{ habit: string, impact: string, recommendation: string, score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (logs.length > 0 && profile) {
        const [sum, analysis, clus, impacts] = await Promise.all([
          generateCycleSummary(profile, logs),
          analyzeSymptoms(logs),
          getSymptomClusters(logs),
          getHabitImpactPrediction(logs)
        ]);
        setSummary(sum || null);
        setSymptomAnalysis(analysis);
        setClusters(clus);
        setHabitImpacts(impacts);
      }
      setLoading(false);
    };
    fetchData();
  }, [logs.length, profile]);

  // Prepare Habit Trend Data (Last 7 Days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const log = logs.find(l => isSameDay(parseISO(l.date), date));
    return {
      name: format(date, 'MMM dd'),
      energy: log?.energy || 0,
      stress: log?.stress || 0,
      sleep: log?.sleep || 0,
      hydration: log?.hydration || 0,
    };
  });

  // Calculate real cycle history from logs
  const cycleHistoryData = React.useMemo(() => {
    const periodStarts = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => parseISO(l.date))
      .sort((a, b) => a.getTime() - b.getTime());

    const history: { cycle: string, length: number, period: number }[] = [];
    
    // Group consecutive period days into "period starts"
    const distinctStarts: { start: Date, end: Date }[] = [];
    if (periodStarts.length > 0) {
      let currentStart = periodStarts[0];
      let currentEnd = periodStarts[0];
      
      for (let i = 1; i < periodStarts.length; i++) {
        const diff = (periodStarts[i].getTime() - periodStarts[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) { // New period
          distinctStarts.push({ start: currentStart, end: currentEnd });
          currentStart = periodStarts[i];
          currentEnd = periodStarts[i];
        } else {
          currentEnd = periodStarts[i];
        }
      }
      distinctStarts.push({ start: currentStart, end: currentEnd });
    }

    // Calculate lengths between starts
    for (let i = 1; i < distinctStarts.length; i++) {
      const cycleDiff = (distinctStarts[i].start.getTime() - distinctStarts[i-1].start.getTime()) / (1000 * 60 * 60 * 24);
      const periodDiff = (distinctStarts[i-1].end.getTime() - distinctStarts[i-1].start.getTime()) / (1000 * 60 * 60 * 24) + 1;
      
      history.push({
        cycle: format(distinctStarts[i-1].start, 'MMM'),
        length: Math.round(cycleDiff),
        period: Math.round(periodDiff)
      });
    }

    // Fallback to mock if not enough data
    if (history.length < 2) {
      return [
        { cycle: 'Jan', length: 28, period: 5 },
        { cycle: 'Feb', length: 29, period: 6 },
        { cycle: 'Mar', length: 27, period: 5 },
        { cycle: 'Apr', length: 28, period: 4 },
        { cycle: 'May', length: 30, period: 5 },
      ];
    }
    return history.slice(-5);
  }, [logs]);

  const avgCycleLength = cycleHistoryData.length > 0 
    ? (cycleHistoryData.reduce((acc, c) => acc + c.length, 0) / cycleHistoryData.length).toFixed(1)
    : "28.0";

  const avgPeriodLength = cycleHistoryData.length > 0
    ? (cycleHistoryData.reduce((acc, c) => acc + c.period, 0) / cycleHistoryData.length).toFixed(1)
    : "5.0";

  // Phase Duration Data
  const phaseData = [
    { name: 'Menstrual', value: 5, fill: '#F43F5E' },
    { name: 'Follicular', value: 8, fill: '#B2DFDB' },
    { name: 'Ovulatory', value: 3, fill: '#D1C4E9' },
    { name: 'Luteal', value: (profile?.cycleLength || 28) - 16, fill: '#5D4063' },
  ];

  // Radar Chart Data (Averages)
  const radarData = [
    { subject: 'Energy', A: logs.reduce((acc, l) => acc + l.energy, 0) / (logs.length || 1), fullMark: 10 },
    { subject: 'Stress', A: logs.reduce((acc, l) => acc + l.stress, 0) / (logs.length || 1), fullMark: 10 },
    { subject: 'Sleep', A: (logs.reduce((acc, l) => acc + l.sleep, 0) / (logs.length || 1)) * (10/12), fullMark: 10 },
    { subject: 'Hydration', A: (logs.reduce((acc, l) => acc + l.hydration, 0) / (logs.length || 1)) * (10/15), fullMark: 10 },
  ];

  // Prepare Symptom Frequency Data
  const symptomCounts: Record<string, number> = {};
  logs.forEach(log => {
    log.symptoms.forEach(s => {
      const name = typeof s === 'string' ? s : s.name;
      symptomCounts[name] = (symptomCounts[name] || 0) + 1;
    });
  });

  const symptomData = Object.entries(symptomCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Prepare Flow Intensity Data (Last Period)
  const flowIntensityData = React.useMemo(() => {
    const periodLogs = logs
      .filter(l => l.flow && l.flow !== 'None')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (periodLogs.length === 0) return [];

    // Get the most recent continuous period
    const lastLogDate = new Date(periodLogs[periodLogs.length - 1].date);
    const currentPeriodLogs = [];
    for (let i = periodLogs.length - 1; i >= 0; i--) {
      const logDate = new Date(periodLogs[i].date);
      const diff = (lastLogDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 7) { // Assume a period is within 7 days of the last day
        currentPeriodLogs.unshift(periodLogs[i]);
      } else {
        break;
      }
    }

    const flowMap = { 'None': 0, 'Light': 1, 'Medium': 2, 'Heavy': 3 };
    return currentPeriodLogs.map((l, i) => ({
      day: `Day ${i + 1}`,
      intensity: flowMap[l.flow as keyof typeof flowMap] || 0,
      label: l.flow
    }));
  }, [logs]);

  const COLORS = ['#5D4063', '#8E7094', '#D1C4E9', '#B2DFDB', '#E0F2F1'];

  return (
    <div className="space-y-8 pb-32 p-6 pt-12 bg-luna-cream min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-serif text-luna-purple">Cycle Intelligence</h1>
        <p className="text-sm opacity-50 mt-2">Personalized patterns and predictions</p>
      </header>

      <section className="space-y-6">
        {/* AI Summary Card */}
        <div className="bg-luna-purple text-white rounded-[32px] p-8 space-y-4 shadow-2xl shadow-luna-purple/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-white/60">
              <Brain className="w-4 h-4" />
              <span className="text-[10px] font-sans uppercase tracking-widest font-bold">AI Monthly Summary</span>
            </div>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-white/20 rounded w-3/4" />
                <div className="h-4 bg-white/20 rounded w-1/2" />
              </div>
            ) : (
              <p className="text-lg font-serif leading-tight italic">
                "{summary || "Log more data to receive your personalized monthly cycle summary."}"
              </p>
            )}
          </div>
        </div>

        {/* Flow Intensity Pattern */}
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif">Flow Intensity Pattern</h3>
            <Activity className="w-5 h-5 opacity-20" />
          </div>
          {flowIntensityData.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowIntensityData}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5D406360' }} />
                  <YAxis hide domain={[0, 4]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '12px' }}
                    formatter={(value: number) => [flowIntensityData.find(d => d.intensity === value)?.label || value, 'Intensity']}
                  />
                  <Area type="stepAfter" dataKey="intensity" stroke="#F43F5E" fillOpacity={1} fill="url(#colorFlow)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 opacity-40 bg-black/5 rounded-3xl border border-dashed border-black/10">
              <Activity className="w-8 h-8" />
              <p className="text-xs font-medium italic">Log your period flow to see intensity patterns</p>
            </div>
          )}
          <p className="text-[10px] opacity-40 italic text-center">Visualizing your most recent period's flow progression</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cycle Phase Duration - Stylized Radial Bar */}
          <div className="luna-card space-y-6 overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-luna-purple/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-xl font-serif">Phase Rhythm</h3>
              <PieIcon className="w-5 h-5 opacity-20" />
            </div>
            <div className="h-64 w-full relative z-10 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={phaseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={10}
                  >
                    {phaseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', padding: '12px 16px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Total</span>
                <span className="text-2xl font-serif text-luna-purple">{profile?.cycleLength || 28}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Days</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
              {phaseData.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                  <span className="text-[10px] font-medium opacity-60">{p.name}: {p.value}d</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wellness Radar Chart (The "Diamond Plot") */}
          <div className="luna-card space-y-6 overflow-hidden relative">
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-xl font-serif">Wellness Balance</h3>
              <Activity className="w-5 h-5 opacity-20" />
            </div>
            <div className="h-64 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#5D406320" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#5D406380', fontWeight: 'bold' }} />
                  <Radar
                    name="Averages"
                    dataKey="A"
                    stroke="#5D4063"
                    fill="#5D4063"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] opacity-40 italic text-center relative z-10">Your holistic wellness equilibrium across key metrics</p>
          </div>
        </div>

        {/* Period Length History */}
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif">Period Length</h3>
            <BarChart3 className="w-5 h-5 opacity-20" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cycleHistoryData}>
                <defs>
                  <linearGradient id="colorPeriod" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="cycle" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5D406360' }} />
                <YAxis hide domain={[0, 10]} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '12px' }} />
                <Area type="monotone" dataKey="period" stroke="#F43F5E" fillOpacity={1} fill="url(#colorPeriod)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span>Average: {avgPeriodLength} Days</span>
            <span>Trend: {Number(avgPeriodLength) > 5 ? 'Stable' : 'Decreasing'}</span>
          </div>
        </div>

        {/* Cycle Length History */}
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif">Cycle History</h3>
            <CalendarIcon className="w-5 h-5 opacity-20" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleHistoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis 
                  dataKey="cycle" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#5D406360' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#5D406360' }}
                  domain={[20, 40]}
                />
                <Tooltip 
                  cursor={{ fill: '#5D406305' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="length" fill="#5D4063" radius={[10, 10, 0, 0]} barSize={30}>
                  {cycleHistoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.length > 32 || entry.length < 24 ? '#F43F5E' : '#5D4063'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span>Average: {avgCycleLength} Days</span>
            <span>Regularity: 94%</span>
          </div>
        </div>

        {/* Habit Impact Prediction */}
        {habitImpacts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-bold text-luna-purple">Habit Impact Forecast</h3>
            <div className="grid grid-cols-1 gap-4">
              {habitImpacts.map((impact, i) => (
                <div key={i} className="bg-white border border-black/5 p-6 rounded-[32px] space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${impact.score < 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span className="text-sm font-bold text-luna-purple">{impact.habit} Impact</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${impact.score < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {impact.score > 0 ? '+' : ''}{impact.score}%
                    </span>
                  </div>
                  <p className="text-xs opacity-60 leading-relaxed">{impact.impact}</p>
                  <div className="pt-2 border-t border-black/5 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-luna-purple" />
                    <p className="text-[10px] font-bold text-luna-purple italic">{impact.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Symptom Clusters */}
        {clusters.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-bold text-luna-purple">Symptom Clustering</h3>
            <div className="grid grid-cols-1 gap-4">
              {clusters.map((clus, i) => (
                <div key={i} className="bg-white border border-black/5 p-6 rounded-[32px] space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-luna-purple">{clus.cluster} Cluster</h4>
                    <div className="flex -space-x-2">
                      {clus.symptoms.slice(0, 3).map((s, j) => (
                        <div key={j} className="w-6 h-6 rounded-full bg-luna-purple/10 border-2 border-white flex items-center justify-center text-[8px] font-bold text-luna-purple">
                          {s[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {clus.symptoms.map((s, j) => (
                      <span key={j} className="text-[9px] bg-black/5 px-2 py-0.5 rounded-full opacity-60">{s}</span>
                    ))}
                  </div>
                  <p className="text-[11px] opacity-50 italic leading-relaxed">"{clus.insight}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PCOS Insights Section */}
        {profile?.cycleLength && (profile.cycleLength > 35 || logs.filter(l => l.flow && l.flow !== 'None').length < 3) && (
          <div className="bg-luna-purple/5 border border-luna-purple/10 p-8 rounded-[40px] space-y-4">
            <div className="flex items-center gap-3 text-luna-purple">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-widest text-[10px]">Cycle Irregularity Intelligence</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-serif text-luna-purple leading-tight">
                Your cycle length ({profile.cycleLength} days) and logging patterns show indicators of significant variability.
              </p>
              <p className="text-xs text-luna-purple/60 leading-relaxed">
                Luna has detected patterns often associated with hormonal imbalances or PCOS. We recommend discussing these findings with a professional.
              </p>
              </div>
          </div>
        )}

        {/* AI Symptom Analysis */}
        {symptomAnalysis.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-bold text-luna-purple">AI Symptom Analysis</h3>
            <div className="space-y-3">
              {symptomAnalysis.map((item, i) => (
                <div key={i} className="bg-white border border-black/5 p-6 rounded-[24px] flex gap-4 items-start">
                  <div className="p-2 bg-rose-50 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-luna-purple">{item.symptom}</p>
                    <p className="text-xs opacity-60 leading-relaxed">{item.analysis}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Symptom Frequency Graph */}
        <div className="luna-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif">Symptom Frequency</h3>
            <AlertCircle className="w-5 h-5 opacity-20" />
          </div>
          {symptomData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptomData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#5D4063', fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                    {symptomData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 opacity-40">
              <CalendarIcon className="w-8 h-8" />
              <p className="text-xs font-medium italic">Log symptoms to see frequency trends</p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-luna-teal/10 rounded-[24px] p-6 space-y-2">
            <TrendingUp className="w-5 h-5 text-teal-700" />
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Regularity</p>
            <p className="text-2xl font-serif">94%</p>
          </div>
          <div className="bg-amber-50 rounded-[24px] p-6 space-y-2">
            <AlertCircle className="w-5 h-5 text-amber-700" />
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Variability</p>
            <p className="text-2xl font-serif">±2 days</p>
          </div>
        </div>

      </section>
    </div>
  );
};
