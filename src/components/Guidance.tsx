import React, { useState } from 'react';
import { useLuna } from '../LunaContext';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Apple, Dumbbell, Moon, Search, ChevronRight, Plane, Calendar as CalendarIcon, AlertCircle, Trash2, Plus, X, Clock, BookOpen, Sparkles } from 'lucide-react';
import { format, addDays, isWithinInterval, startOfDay, parseISO } from 'date-fns';

interface GuidanceArticle {
  title: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
  description: string;
  content: string;
}

const GUIDANCE_ARTICLES: GuidanceArticle[] = [
  {
    title: "Navigating Travel with Your Cycle",
    category: "Lifestyle",
    icon: <Plane className="w-5 h-5 text-luna-purple" />,
    readTime: "5 min",
    description: "How to manage jet lag, period symptoms, and routine changes while on the road.",
    content: `Traveling can disrupt your body's natural rhythm, especially if you're crossing time zones. Here's how to stay balanced:

1. Hydration is Key: Flying is dehydrating, which can worsen bloating and fatigue. Drink plenty of water and limit caffeine.
2. Manage Jet Lag: Try to align your sleep with your destination as soon as possible. Light exposure in the morning can help reset your circadian rhythm.
3. Pack a "Cycle Kit": Include your preferred period products, a heating pad (portable ones are great), and any supplements you usually take.
4. Listen to Your Energy: If you're in your luteal phase, don't overschedule your trip. Allow for downtime and early nights.`
  },
  {
    title: "The Glucose-Hormone Connection",
    category: "Nutrition",
    icon: <Apple className="w-5 h-5 text-orange-500" />,
    readTime: "6 min",
    description: "Understanding how blood sugar stability impacts your hormonal health and mood.",
    content: `Your blood sugar levels and your hormones are in a constant dance. Stable glucose can lead to more stable moods and fewer PMS symptoms.

Tips for Glucose Stability:
- Protein-First: Start your meals with protein to slow the absorption of glucose.
- Fiber is Your Friend: Fiber-rich vegetables act as a buffer for sugar.
- Vinegar Hack: A tablespoon of apple cider vinegar in water before a meal can help dampen the glucose spike.
- Post-Meal Movement: A 10-minute walk after eating helps your muscles use the glucose in your bloodstream.`
  },
  {
    title: "Stress Management for Cycle Health",
    category: "Wellness",
    icon: <Heart className="w-5 h-5 text-rose-500" />,
    readTime: "4 min",
    description: "Simple techniques to lower cortisol and support a healthy, regular cycle.",
    content: `High cortisol (the stress hormone) can "steal" the building blocks needed for progesterone, leading to cycle irregularities and worsened PMS.

Daily Stress Relievers:
- Box Breathing: Inhale for 4, hold for 4, exhale for 4, hold for 4.
- Nature Breaks: Even 5 minutes outside can lower cortisol levels.
- Digital Detox: Set boundaries with your phone, especially in the hour before bed.
- Gratitude Journaling: Focusing on positive moments can shift your nervous system into a state of "rest and digest".`
  }
];

export const Guidance: React.FC = () => {
  const { profile, travelPlans, addTravelPlan, removeTravelPlan } = useLuna();
  const [showAddTravel, setShowAddTravel] = useState(false);
  const [newTravel, setNewTravel] = useState({ destination: '', startDate: '', endDate: '' });
  const [selectedArticle, setSelectedArticle] = useState<GuidanceArticle | null>(null);

  const recommendations = [
    {
      title: "Nutrition Choices",
      icon: <Apple className="w-5 h-5 text-orange-500" />,
      bg: "bg-orange-50",
      items: [
        "Pairing carbohydrates with a source of protein or healthy fat (like berries with Greek yogurt) which many find helpful for glucose management.",
        "Prioritizing fiber-rich vegetables to support digestion and satiety."
      ]
    },
    {
      title: "Movement Choices",
      icon: <Dumbbell className="w-5 h-5 text-emerald-500" />,
      bg: "bg-emerald-50",
      items: [
        "A light walk or gentle yoga to encourage circulation as your body transitions out of the menstrual phase.",
        "Low-impact strength training if you feel your energy levels are beginning to increase."
      ]
    },
    {
      title: "Recovery Choices",
      icon: <Moon className="w-5 h-5 text-indigo-500" />,
      bg: "bg-indigo-50",
      items: [
        "Checking in with your stress levels, as many people notice that stress can impact energy and insulin sensitivity.",
        "Setting a gentle intention for the day to help reduce decision fatigue around self-care."
      ]
    }
  ];

  const checkPeriodOverlap = (travelStart: string, travelEnd: string) => {
    if (!profile) return false;
    const lastStart = new Date(profile.lastPeriodStart);
    const cycleLen = profile.cycleLength || 28;
    const periodLen = profile.periodLength || 5;
    
    const tStart = startOfDay(parseISO(travelStart));
    const tEnd = startOfDay(parseISO(travelEnd));

    // Check next 6 cycles
    for (let i = 0; i < 6; i++) {
      const pStart = addDays(lastStart, (i + 1) * cycleLen);
      const pEnd = addDays(pStart, periodLen - 1);

      const overlap = (tStart <= pEnd && tEnd >= pStart);
      if (overlap) return true;
    }
    return false;
  };

  const handleAddTravel = () => {
    if (newTravel.destination && newTravel.startDate && newTravel.endDate) {
      addTravelPlan({
        id: Math.random().toString(36).substr(2, 9),
        ...newTravel
      });
      setNewTravel({ destination: '', startDate: '', endDate: '' });
      setShowAddTravel(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 bg-luna-cream min-h-screen">
      <header className="px-4 pt-8">
        <div className="flex items-center gap-2 text-luna-purple/60 mb-1">
          <Heart className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-bold">Daily LifeGuide</span>
        </div>
        <h1 className="text-4xl font-serif">Personalized Support</h1>
        <p className="opacity-50">Informed options for your specific rhythm</p>
      </header>

      <section className="px-4">
        <div className="luna-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-luna-purple/60">
              <Plane className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Travel Planner</span>
            </div>
            <button 
              onClick={() => setShowAddTravel(!showAddTravel)}
              className="p-2 bg-luna-purple/5 rounded-full text-luna-purple"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showAddTravel && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <input 
                  type="text" 
                  placeholder="Destination"
                  value={newTravel.destination}
                  onChange={e => setNewTravel({...newTravel, destination: e.target.value})}
                  className="w-full bg-black/5 border-none rounded-xl py-3 px-4 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">Start Date</label>
                    <input 
                      type="date" 
                      value={newTravel.startDate}
                      onChange={e => setNewTravel({...newTravel, startDate: e.target.value})}
                      className="w-full bg-black/5 border-none rounded-xl py-3 px-4 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1">End Date</label>
                    <input 
                      type="date" 
                      value={newTravel.endDate}
                      onChange={e => setNewTravel({...newTravel, endDate: e.target.value})}
                      className="w-full bg-black/5 border-none rounded-xl py-3 px-4 text-sm"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddTravel}
                  className="w-full luna-button-primary py-3 text-sm"
                >
                  Add Trip
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {travelPlans.length === 0 ? (
              <p className="text-sm opacity-40 italic text-center py-4">No upcoming travel plans logged.</p>
            ) : (
              travelPlans.map(plan => {
                const hasOverlap = checkPeriodOverlap(plan.startDate, plan.endDate);
                return (
                  <div key={plan.id} className="p-4 bg-black/5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{plan.destination}</h4>
                        <p className="text-xs opacity-50">
                          {format(parseISO(plan.startDate), 'MMM d')} — {format(parseISO(plan.endDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <button onClick={() => removeTravelPlan(plan.id)} className="p-2 opacity-30 hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {hasOverlap && (
                      <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">
                          Period Alert: Predicted during this trip. Pack accordingly!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="px-4 space-y-4">
        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Deep Dives & Insights</p>
        <div className="grid grid-cols-1 gap-4">
          {GUIDANCE_ARTICLES.map((article, i) => (
            <motion.div 
              key={i}
              whileHover={{ x: 4 }}
              onClick={() => setSelectedArticle(article)}
              className="luna-card flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-luna-cream rounded-xl group-hover:bg-luna-purple/5 transition-colors">
                  {article.icon}
                </div>
                <div>
                  <h4 className="font-serif text-lg">{article.title}</h4>
                  <p className="text-[10px] uppercase tracking-widest opacity-40">{article.category} • {article.readTime}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-4 space-y-4">
        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Commonly Helpful Options (Choose what fits)</p>
        {recommendations.map((rec, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="luna-card space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${rec.bg} flex items-center justify-center`}>
                {rec.icon}
              </div>
              <h3 className="text-2xl font-serif">{rec.title}</h3>
            </div>
            <div className="space-y-4">
              {rec.items.map((item, j) => (
                <div key={j} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-black/10 mt-0.5 shrink-0" />
                  <p className="text-sm opacity-70 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </section>

      <section className="px-4 pb-8">
        <div className="luna-card space-y-4">
          <div className="flex items-center gap-2 text-luna-purple/60">
            <Search className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Specific Habit Audit</span>
          </div>
          <p className="text-sm opacity-50">Ask how a specific habit might support your rhythm</p>
          <div className="relative">
            <input 
              type="text" 
              placeholder={`e.g. "How should I manage my afternoon caffeine?"`}
              className="w-full bg-black/5 border-none rounded-2xl py-6 px-6 pr-16 text-sm placeholder:italic"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-black/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-luna-cream rounded-2xl">
                    {selectedArticle.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-luna-purple font-bold uppercase tracking-widest opacity-50">{selectedArticle.category}</span>
                    <h3 className="text-2xl font-serif text-luna-purple">{selectedArticle.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="flex items-center gap-6 text-[10px] font-sans uppercase tracking-widest opacity-40">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {selectedArticle.readTime} read
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3" />
                    Guidance
                  </div>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <div className="text-sm leading-relaxed text-luna-purple/80 whitespace-pre-line">
                    {selectedArticle.content}
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-luna-cream/30 border-t border-black/5 shrink-0">
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="luna-button-primary w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
                >
                  Close Article
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
