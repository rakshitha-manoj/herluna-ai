import { format, addDays, subDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, startOfDay } from 'date-fns';

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';

export interface Symptom {
  id: string;
  name: string;
  severity: 1 | 2 | 3; // Mild, Moderate, Severe
}

export interface DailyLog {
  date: string; // ISO string
  symptoms: Symptom[];
  mood: string;
  energy: number; // 1-10
  stress: number; // 1-10
  sleep: number; // hours
  exercise: boolean;
  hydration: number; // glasses
  diet?: string; // e.g., 'Healthy', 'Fast Food', 'High Protein'
  journal?: string; // "how was your day?"
  flow?: 'None' | 'Light' | 'Medium' | 'Heavy';
  notes?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  password?: string;
  ageGroup: '13-18' | '19-25' | '26-35' | '36-45' | '46+';
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
  isIrregular: boolean;
  storageMode: 'Local' | 'Cloud';
  lastPeriodStart: string;
  lastPeriodEnd?: string;
  activePeriodStart?: string; // If currently bleeding
  cycleLength: number; // default 28
  periodLength: number; // default 5
}

export interface TravelPlan {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Prediction {
  type: 'Mood' | 'Symptom' | 'Energy' | 'PMS' | 'Anomaly' | 'PCOS' | 'Cycle';
  title: string;
  description: string;
  probability?: string;
  value?: number; // 0-100 for visualization
  timeframe?: string;
  severity?: 'Low' | 'Moderate' | 'High';
}

export const SYMPTOM_OPTIONS = [
  'Cramps', 'Bloating', 'Headache', 'Acne', 'Breast Tenderness', 
  'Back Pain', 'Nausea', 'Fatigue', 'Insomnia', 'Cravings', 
  'Mood Swings', 'Anxious', 'Depressed', 'Irritable', 'Brain Fog',
  'Diarrhea', 'Constipation', 'Dizziness', 'Hot Flashes', 'Night Sweats'
];

export const MOOD_OPTIONS = [
  'Stable', 'Happy', 'Anxious', 'Irritable', 'Sad', 'Energetic', 'Calm',
  'Emotional', 'Sensitive', 'Focused', 'Unfocused', 'Angry', 'Peaceful'
];

export const MOCK_GOALS = [
  'Manage Fatigue', 'Reduce Inflammation', 'Stabilize Mood', 'Improve Fertility', 'Regularize Cycle'
];

export const FLOW_LEVELS = ['None', 'Light', 'Medium', 'Heavy'];

export const getPhase = (date: Date, lastStart: Date, cycleLen: number, activePeriodStart?: string): CyclePhase => {
  if (activePeriodStart) {
    const activeStart = new Date(activePeriodStart);
    if (isWithinInterval(startOfDay(date), { 
      start: startOfDay(activeStart), 
      end: startOfDay(new Date()) // Or some reasonable future end
    })) return 'Menstrual';
  }

  const diff = differenceInDays(date, lastStart) % cycleLen;
  if (diff < 0) return 'Luteal'; // Simple wrap around for past dates
  
  if (diff < 5) return 'Menstrual';
  if (diff < 13) return 'Follicular';
  if (diff < 16) return 'Ovulatory';
  return 'Luteal';
};

export const getPhaseColor = (phase: CyclePhase) => {
  switch (phase) {
    case 'Menstrual': return 'bg-rose-100 text-rose-700';
    case 'Follicular': return 'bg-luna-teal text-teal-800';
    case 'Ovulatory': return 'bg-amber-100 text-amber-800';
    case 'Luteal': return 'bg-luna-purple/10 text-luna-purple';
  }
};
