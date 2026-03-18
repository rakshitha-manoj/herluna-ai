import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Heart, Zap, Moon, Sun, ShieldCheck, Sparkles, X, Clock, Lightbulb } from 'lucide-react';
import { useLuna } from '../LunaContext';
import { getPhase } from '../types';
import { generateDailyTip } from '../services/ai';

interface Article {
// ... (rest of the interface)
  title: string;
  category: string;
  icon: React.ReactNode;
  readTime: string;
  description: string;
  content: string;
}

const ARTICLES: Article[] = [
  {
    title: "Mastering the Art of Cycle Syncing",
    category: "Physiology",
    readTime: "5 min",
    icon: <Sparkles className="w-5 h-5 text-luna-purple" />,
    description: "Learn how rising estrogen levels impact your energy, mood, and cognitive function during this dynamic phase.",
    content: `The follicular phase begins on the first day of your period and lasts until ovulation. During this time, your body is preparing to release an egg.

Key Hormonal Shifts:
Estrogen levels start low and gradually rise. This increase in estrogen often leads to:
- Increased energy and stamina
- Improved mood and social confidence
- Enhanced verbal skills and memory
- Clearer skin and a natural "glow"

Lifestyle Tips:
1. Nutrition: Focus on fresh, vibrant foods. Fermented foods like kimchi or sauerkraut can support estrogen metabolism.
2. Fitness: This is a great time for high-intensity workouts or trying new activities as your energy peaks.
3. Career: Schedule brainstorms, presentations, or networking events during this phase when your communication skills are at their sharpest.`
  },
  {
    title: "The Luteal Phase: A Time for Reflection",
    category: "Wellness",
    readTime: "7 min",
    icon: <Moon className="w-5 h-5 text-indigo-500" />,
    description: "Discover the importance of progesterone and how to support your body as it prepares for menstruation.",
    content: `The luteal phase occurs after ovulation and before your period starts. Progesterone becomes the dominant hormone, preparing the uterine lining for a potential pregnancy.

What to Expect:
As progesterone rises, you might experience:
- A natural desire to turn inward and slow down
- Increased appetite and a preference for warm, comforting foods
- Heightened sensitivity to stress
- Potential PMS symptoms like bloating or breast tenderness

Supporting Your Body:
1. Nutrition: Prioritize complex carbohydrates (sweet potatoes, oats) to stabilize blood sugar and support serotonin production.
2. Fitness: Shift towards restorative movement like yoga, Pilates, or long walks. Listen to your body's need for rest.
3. Self-Care: This is the "autumn" of your cycle. It's a perfect time for journaling, organizing your space, and saying "no" to extra social commitments.`
  },
  {
    title: "The Science of Seed Cycling",
    category: "Nutrition",
    readTime: "8 min",
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    description: "A deep dive into how rotating flax, pumpkin, sesame, and sunflower seeds can support your hormonal balance.",
    content: `Seed cycling is a gentle way to support your hormones through nutrition. By rotating specific seeds during the two main phases of your cycle, you provide your body with the nutrients it needs to produce and metabolize estrogen and progesterone.

Phase 1: Follicular (Days 1-14)
Focus: Estrogen Support
Seeds: 1-2 tbsp of raw, ground flax and pumpkin seeds daily.
Why: Flax seeds contain lignans which bind to excess estrogen, while pumpkin seeds are high in zinc, supporting progesterone production for the next phase.

Phase 2: Luteal (Days 15-28)
Focus: Progesterone Support
Seeds: 1-2 tbsp of raw, ground sesame and sunflower seeds daily.
Why: Sesame seeds contain lignans that help block excess estrogen, while sunflower seeds are high in Vitamin E and selenium, supporting progesterone levels.

Consistency is key. It often takes 3-4 cycles to notice significant changes in symptoms like bloating, acne, or mood swings.`
  },
  {
    title: "Cycle Syncing Your Career",
    category: "Lifestyle",
    readTime: "10 min",
    icon: <Sun className="w-5 h-5 text-orange-400" />,
    description: "Optimize your productivity and reduce burnout by aligning your work tasks with your hormonal energy levels.",
    content: `Your brain chemistry changes throughout the month. By understanding these shifts, you can work with your body instead of against it.

Menstrual Phase (The Visionary):
Energy: Low, introspective.
Best Tasks: Reviewing the past month, setting goals, deep creative work, and solo projects.
Tip: Avoid scheduling high-stakes meetings if possible.

Follicular Phase (The Initiator):
Energy: Rising, creative, social.
Best Tasks: Brainstorming, starting new projects, networking, and learning new skills.
Tip: This is your peak time for innovation.

Ovulatory Phase (The Communicator):
Energy: Highest, social, confident.
Best Tasks: Presentations, negotiations, difficult conversations, and collaborative work.
Tip: You are at your most persuasive now.

Luteal Phase (The Editor):
Energy: Declining, detail-oriented.
Best Tasks: Completing projects, administrative work, organizing, and proofreading.
Tip: You may feel more critical; use this to catch errors, but be kind to yourself.`
  }
];

export const Education: React.FC = () => {
  const { profile } = useLuna();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(true);

  const today = new Date();
  const lastStart = new Date(profile?.lastPeriodStart || today);
  const cycleLen = profile?.cycleLength || 28;
  const phase = getPhase(today, lastStart, cycleLen, profile?.activePeriodStart);

  useEffect(() => {
    const fetchTip = async () => {
      if (profile) {
        const tip = await generateDailyTip(profile, phase);
        setDailyTip(tip);
      }
      setLoadingTip(false);
    };
    fetchTip();
  }, [profile, phase]);

  const phaseTips = {
// ... (rest of the component)
    'Menstrual': "Focus on iron-rich foods and gentle movement. Your body is in a state of release.",
    'Follicular': "Energy is rising. Great time for new projects and high-intensity workouts.",
    'Ovulatory': "Communication and social energy peak. You're at your most fertile and vibrant.",
    'Luteal': "Turn inward. Prioritize magnesium and slow down as progesterone rises."
  };

  return (
    <div className="space-y-8 pb-32 bg-luna-cream min-h-screen">
      <header className="px-8 pt-12 space-y-1">
        <h1 className="text-4xl font-serif tracking-tight text-luna-purple">Knowledge Base</h1>
        <p className="text-[10px] font-sans uppercase tracking-[0.3em] opacity-50">Empower Your Rhythm</p>
      </header>

      <section className="px-8 grid grid-cols-1 gap-6">
        <div className="bg-luna-purple text-white p-8 rounded-[32px] relative overflow-hidden shadow-2xl shadow-luna-purple/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-white/60">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-sans uppercase tracking-widest font-bold">Featured Guide</span>
            </div>
            <h2 className="text-3xl font-serif leading-tight">Mastering the Art of Cycle Syncing</h2>
            <p className="text-sm opacity-60 max-w-md">A comprehensive guide to aligning your lifestyle, diet, and career with your natural hormonal fluctuations.</p>
            <button 
              onClick={() => setSelectedArticle(ARTICLES[0])}
              className="h-12 px-8 bg-white text-luna-purple rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Read Guide
            </button>
          </div>
        </div>
      </section>

      <section className="px-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-sans uppercase tracking-[0.2em] font-bold text-luna-purple">Latest Articles</h3>
          <button className="text-[10px] font-sans uppercase tracking-widest text-luna-purple font-bold opacity-50">View All</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ARTICLES.map((article, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedArticle(article)}
              className="bg-white border border-black/5 p-6 rounded-[24px] space-y-4 cursor-pointer hover:shadow-xl hover:shadow-black/5 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-luna-cream/50 rounded-2xl">
                  {article.icon}
                </div>
                <span className="text-[9px] font-sans opacity-30 font-bold uppercase tracking-widest">{article.readTime} read</span>
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-sans text-luna-purple font-bold uppercase tracking-widest opacity-50">{article.category}</span>
                <h4 className="text-xl font-serif text-luna-purple">{article.title}</h4>
                <p className="text-xs opacity-60 leading-relaxed">{article.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-8">
        <div className="bg-luna-purple/5 border border-luna-purple/10 p-8 rounded-[32px] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Lightbulb className="w-5 h-5 text-luna-purple" />
            </div>
            <div>
              <h3 className="text-xl font-serif text-luna-purple">Daily AI Tip</h3>
              <p className="text-[10px] font-sans uppercase tracking-widest opacity-40">Phase: {phase}</p>
            </div>
          </div>
          {loadingTip ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-luna-purple/10 rounded w-3/4" />
              <div className="h-4 bg-luna-purple/10 rounded w-1/2" />
            </div>
          ) : (
            <p className="text-sm text-luna-purple/70 leading-relaxed font-medium italic">
              "{dailyTip || phaseTips[phase as keyof typeof phaseTips]}"
            </p>
          )}
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
                  <div className="p-3 bg-luna-cream/50 rounded-2xl">
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
                    Educational
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
