import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, DailyLog, TravelPlan, ChatMessage, Prediction } from './types';
import { subDays, differenceInDays } from 'date-fns';
import { auth, db, signInWithGoogle, logout as firebaseLogout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';

interface LunaContextType {
  profile: UserProfile | null;
  logs: DailyLog[];
  travelPlans: TravelPlan[];
  chatMessages: ChatMessage[];
  predictions: Prediction[];
  user: User | null;
  setProfile: (p: UserProfile) => void;
  startPeriod: (date: Date) => void;
  endPeriod: (date: Date) => void;
  addLog: (l: DailyLog) => void;
  addTravelPlan: (p: TravelPlan) => void;
  removeTravelPlan: (id: string) => void;
  addChatMessage: (m: ChatMessage) => void;
  setPredictions: (p: Prediction[]) => void;
  resetAllData: () => void;
  signup: (email: string, password: string, p: UserProfile) => Promise<void>;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isInitialized: boolean;
  dynamicCycleLength: number;
  dynamicPeriodLength: number;
  dynamicLastStart: Date;
}

const LunaContext = createContext<LunaContextType | undefined>(undefined);

export const LunaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [predictions, setPredictionsState] = useState<Prediction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // If logged out, load from local storage
        const savedProfile = localStorage.getItem('luna_profile');
        const savedLogs = localStorage.getItem('luna_logs');
        const savedTravel = localStorage.getItem('luna_travel');
        const savedChat = localStorage.getItem('luna_chat');
        const savedPreds = localStorage.getItem('luna_preds');
        
        if (savedProfile) setProfileState(JSON.parse(savedProfile));
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          setLogs(parsedLogs);
          // Auto-seed if empty for demo
          if (parsedLogs.length === 0) {
            triggerAutoSeed();
          }
        } else {
          // No logs at all, trigger auto-seed
          triggerAutoSeed();
        }
        if (savedTravel) setTravelPlans(JSON.parse(savedTravel));
        if (savedChat) setChatMessages(JSON.parse(savedChat));
        if (savedPreds) setPredictionsState(JSON.parse(savedPreds));
      }
      setIsInitialized(true);
    });

    const triggerAutoSeed = () => {
      // Small timeout to ensure context is ready
      setTimeout(() => {
        const hasSeeded = localStorage.getItem('luna_demo_seeded');
        if (!hasSeeded) {
          generateSeedData();
          localStorage.setItem('luna_demo_seeded', 'true');
        }
      }, 1000);
    };

    const generateSeedData = () => {
      const newLogs: any[] = [];
      const now = new Date();
      let cursor = new Date(now);
      
      const gaps = [120, 90, 180, 110];
      const durations = [10, 6, 8, 4, 12];
      
      for (let i = 0; i < 5; i++) {
        const duration = durations[i % durations.length];
        for (let d = 0; d < duration; d++) {
          newLogs.push({
            date: cursor.toISOString().split('T')[0],
            flow: d < 2 ? 'Heavy' : d < 5 ? 'Medium' : 'Light',
            symptoms: [{ id: '1', name: 'Cramps', severity: 2 }],
            mood: 'Irritable', energy: 3, stress: 7, sleep: 6, hydration: 4, exercise: false
          });
          cursor.setDate(cursor.getDate() - 1);
        }
        const gap = gaps[i % gaps.length];
        for (let g = 0; g < 15; g++) {
          const randomGapDate = new Date(cursor);
          randomGapDate.setDate(cursor.getDate() - Math.floor(Math.random() * gap));
          newLogs.push({
            date: randomGapDate.toISOString().split('T')[0],
            flow: 'None', symptoms: [{ id: '2', name: 'Fatigue', severity: 1 }],
            mood: 'Stable', energy: 5, stress: 4, sleep: 7, hydration: 6, exercise: true
          });
        }
        cursor.setDate(cursor.getDate() - gap);
      }
      
      const sorted = newLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLogs(sorted);
      localStorage.setItem('luna_logs', JSON.stringify(sorted));
      
      // Update profile
      const latest = sorted.find(l => l.flow !== 'None');
      if (latest) {
        setProfileState(prev => prev ? ({ ...prev, lastPeriodStart: latest.date, isIrregular: true }) : null);
      }
    };

    // Safety timeout: if Firebase auth doesn't respond within 5 seconds,
    // initialize anyway using local storage data
    const safetyTimer = setTimeout(() => {
      setIsInitialized((prev) => {
        if (!prev) {
          console.warn('[Luna] Firebase auth timed out, initializing from localStorage');
          const savedProfile = localStorage.getItem('luna_profile');
          const savedLogs = localStorage.getItem('luna_logs');
          const savedTravel = localStorage.getItem('luna_travel');
          const savedChat = localStorage.getItem('luna_chat');
          const savedPreds = localStorage.getItem('luna_preds');
          
          if (savedProfile) setProfileState(JSON.parse(savedProfile));
          if (savedLogs) setLogs(JSON.parse(savedLogs));
          if (savedTravel) setTravelPlans(JSON.parse(savedTravel));
          if (savedChat) setChatMessages(JSON.parse(savedChat));
          if (savedPreds) setPredictionsState(JSON.parse(savedPreds));
        }
        return true;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // Cloud Sync Listener
  useEffect(() => {
    // If we have a user, always try to sync from Cloud if they choose it 
    // or if we don't have a profile yet (checking for existing cloud account)
    if (user) {
      const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          const cloudData = doc.data() as UserProfile;
          setProfileState(cloudData);
          localStorage.setItem('luna_profile', JSON.stringify(cloudData));
        }
      });

      // Only sync collections if we are confirmed in Cloud mode
      let unsubLogs: (() => void) | undefined;
      let unsubTravel: (() => void) | undefined;
      let unsubChat: (() => void) | undefined;
      let unsubPreds: (() => void) | undefined;

      if (profile?.storageMode === 'Cloud' || !profile) {
        unsubLogs = onSnapshot(collection(db, 'users', user.uid, 'logs'), (snapshot) => {
          const cloudLogs = snapshot.docs.map(d => d.data() as DailyLog);
          setLogs(cloudLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        });
        unsubTravel = onSnapshot(collection(db, 'users', user.uid, 'travel'), (snapshot) => {
          setTravelPlans(snapshot.docs.map(d => d.data() as TravelPlan));
        });
        unsubChat = onSnapshot(collection(db, 'users', user.uid, 'chat'), (snapshot) => {
          const cloudChat = snapshot.docs.map(d => d.data() as ChatMessage);
          setChatMessages(cloudChat.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        });
        unsubPreds = onSnapshot(doc(db, 'users', user.uid, 'predictions', 'current'), (doc) => {
          if (doc.exists()) setPredictionsState(doc.data().list as Prediction[]);
        });
      }

      return () => {
        unsubProfile();
        unsubLogs?.();
        unsubTravel?.();
        unsubChat?.();
        unsubPreds?.();
      };
    }
  }, [user, profile?.storageMode === 'Cloud']);

  const setProfile = async (p: UserProfile) => {
    setProfileState(p);
    localStorage.setItem('luna_profile', JSON.stringify(p));
    if (user && p.storageMode === 'Cloud') {
      await setDoc(doc(db, 'users', user.uid), p);
    }
  };

  const startPeriod = async (date: Date) => {
    if (!profile) return;
    const updated: UserProfile = { ...profile, activePeriodStart: date.toISOString() };
    await setProfile(updated);
  };

  const endPeriod = async (date: Date) => {
    if (!profile || !profile.activePeriodStart) return;
    const duration = differenceInDays(date, new Date(profile.activePeriodStart)) + 1;
    const updated: UserProfile = { 
      ...profile, 
      lastPeriodStart: profile.activePeriodStart,
      lastPeriodEnd: date.toISOString(),
      activePeriodStart: undefined,
      periodLength: duration > 0 ? duration : profile.periodLength
    };
    await setProfile(updated);
  };

  const addLog = async (l: DailyLog) => {
    // 1. Hard restrict against logging future dates natively at the controller level
    if (new Date(l.date) > new Date()) {
      console.warn("HerLuna blocks logging data for future dates.");
      return;
    }

    const newLogs = [...logs.filter(log => log.date !== l.date), l].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setLogs(newLogs);
    localStorage.setItem('luna_logs', JSON.stringify(newLogs));
    
    if (user && profile?.storageMode === 'Cloud') {
      const logId = l.date.split('T')[0]; // Use date as ID for daily logs
      await setDoc(doc(db, 'users', user.uid, 'logs', logId), l);
    }
  };

  const addTravelPlan = async (p: TravelPlan) => {
    const newPlans = [...travelPlans, p];
    setTravelPlans(newPlans);
    localStorage.setItem('luna_travel', JSON.stringify(newPlans));
    if (user && profile?.storageMode === 'Cloud') {
      await setDoc(doc(db, 'users', user.uid, 'travel', p.id), p);
    }
  };

  const removeTravelPlan = async (id: string) => {
    const newPlans = travelPlans.filter(p => p.id !== id);
    setTravelPlans(newPlans);
    localStorage.setItem('luna_travel', JSON.stringify(newPlans));
    if (user && profile?.storageMode === 'Cloud') {
      await deleteDoc(doc(db, 'users', user.uid, 'travel', id));
    }
  };

  const addChatMessage = async (m: ChatMessage) => {
    const newChat = [...chatMessages, m];
    setChatMessages(newChat);
    localStorage.setItem('luna_chat', JSON.stringify(newChat));
    if (user && profile?.storageMode === 'Cloud') {
      await setDoc(doc(db, 'users', user.uid, 'chat', m.id), m);
    }
  };

  const setPredictions = async (p: Prediction[]) => {
    setPredictionsState(p);
    localStorage.setItem('luna_preds', JSON.stringify(p));
    if (user && profile?.storageMode === 'Cloud') {
      await setDoc(doc(db, 'users', user.uid, 'predictions', 'current'), { list: p });
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    setProfileState(null);
    setLogs([]);
    setTravelPlans([]);
    setChatMessages([]);
    setPredictionsState([]);
    window.location.reload();
  };

  const login = async (email?: string, password?: string) => {
    if (email && password) {
      const { signInWithEmailAndPassword } = await import('./firebase');
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithGoogle();
    }
  };

  const signup = async (email: string, password: string, p: UserProfile) => {
    const { createUserWithEmailAndPassword } = await import('./firebase');
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      // After signup, save the profile to Firestore
      await setDoc(doc(db, 'users', result.user.uid), { ...p, storageMode: 'Cloud' });
      setProfileState({ ...p, storageMode: 'Cloud' });
    }
  };

  const logout = async () => {
    await firebaseLogout();
    setProfileState(null);
    setLogs([]);
    setTravelPlans([]);
    setChatMessages([]);
    setPredictionsState([]);
  };

  const dynamicLastStart = React.useMemo(() => {
    const manualDate = profile?.lastPeriodStart ? new Date(profile.lastPeriodStart) : new Date(0);
    const flowLogs = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => new Date(l.date))
      .sort((a,b) => b.getTime() - a.getTime());

    if (flowLogs.length > 0) {
      let latestFlow = flowLogs[0];
      for (let i = 1; i < flowLogs.length; i++) {
        const diff = (latestFlow.getTime() - flowLogs[i].getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 5) {
          latestFlow = flowLogs[i]; // walk backwards to the start of this period block
        } else {
          break;
        }
      }
      return latestFlow > manualDate ? latestFlow : manualDate;
    }
    return manualDate.getTime() > 0 ? manualDate : new Date();
  }, [logs, profile?.lastPeriodStart]);

  const { dynamicCycleLength, dynamicPeriodLength } = React.useMemo(() => {
    const periodStarts = logs
      .filter(l => l.flow && l.flow !== 'None')
      .map(l => new Date(l.date))
      .sort((a, b) => a.getTime() - b.getTime()); // oldest first

    const distinctStarts: { start: Date, end: Date }[] = [];
    if (periodStarts.length > 0) {
      let currentStart = periodStarts[0];
      let currentEnd = periodStarts[0];
      for (let i = 1; i < periodStarts.length; i++) {
        const diff = (periodStarts[i].getTime() - periodStarts[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) { 
          distinctStarts.push({ start: currentStart, end: currentEnd });
          currentStart = periodStarts[i];
        }
        currentEnd = periodStarts[i];
      }
      distinctStarts.push({ start: currentStart, end: currentEnd });
    }

    if (distinctStarts.length < 2) {
      let knownPeriodLen = profile?.periodLength || 5;
      if (distinctStarts.length === 1) {
          knownPeriodLen = Math.max(1, (distinctStarts[0].end.getTime() - distinctStarts[0].start.getTime()) / (1000 * 60 * 60 * 24) + 1);
      }
      return { 
        dynamicCycleLength: profile?.cycleLength || 28, 
        dynamicPeriodLength: knownPeriodLen
      };
    }

    let totalCycle = 0;
    let totalPeriod = 0;
    for (let i = 1; i < distinctStarts.length; i++) {
      totalCycle += (distinctStarts[i].start.getTime() - distinctStarts[i-1].start.getTime()) / (1000 * 60 * 60 * 24);
      totalPeriod += (distinctStarts[i-1].end.getTime() - distinctStarts[i-1].start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    }
    totalPeriod += (distinctStarts[distinctStarts.length-1].end.getTime() - distinctStarts[distinctStarts.length-1].start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    return { 
      dynamicCycleLength: Math.max(20, Math.round(totalCycle / (distinctStarts.length - 1))),
      dynamicPeriodLength: Math.max(1, Math.round(totalPeriod / distinctStarts.length))
    };
  }, [logs, profile?.cycleLength, profile?.periodLength]);

  return (
    <LunaContext.Provider value={{ 
      profile, 
      logs, 
      travelPlans, 
      chatMessages,
      predictions,
      user,
      setProfile, 
      startPeriod,
      endPeriod,
      addLog, 
      addTravelPlan, 
      removeTravelPlan, 
      addChatMessage,
      setPredictions,
      resetAllData,
      signup,
      login,
      logout,
      isInitialized,
      dynamicCycleLength,
      dynamicPeriodLength,
      dynamicLastStart
    }}>
      {children}
    </LunaContext.Provider>
  );
};

export const useLuna = () => {
  const context = useContext(LunaContext);
  if (!context) throw new Error('useLuna must be used within a LunaProvider');
  return context;
};
