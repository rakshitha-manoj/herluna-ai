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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isInitialized: boolean;
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
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        if (savedTravel) setTravelPlans(JSON.parse(savedTravel));
        if (savedChat) setChatMessages(JSON.parse(savedChat));
        if (savedPreds) setPredictionsState(JSON.parse(savedPreds));
      }
      setIsInitialized(true);
    });

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
    if (user && profile?.storageMode === 'Cloud') {
      const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) setProfileState(doc.data() as UserProfile);
      });
      const unsubLogs = onSnapshot(collection(db, 'users', user.uid, 'logs'), (snapshot) => {
        const cloudLogs = snapshot.docs.map(d => d.data() as DailyLog);
        setLogs(cloudLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });
      const unsubTravel = onSnapshot(collection(db, 'users', user.uid, 'travel'), (snapshot) => {
        setTravelPlans(snapshot.docs.map(d => d.data() as TravelPlan));
      });
      const unsubChat = onSnapshot(collection(db, 'users', user.uid, 'chat'), (snapshot) => {
        const cloudChat = snapshot.docs.map(d => d.data() as ChatMessage);
        setChatMessages(cloudChat.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      });
      const unsubPreds = onSnapshot(doc(db, 'users', user.uid, 'predictions', 'current'), (doc) => {
        if (doc.exists()) setPredictionsState(doc.data().list as Prediction[]);
      });
      return () => {
        unsubProfile();
        unsubLogs();
        unsubTravel();
        unsubChat();
        unsubPreds();
      };
    }
  }, [user, profile?.storageMode]);

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

  const login = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await firebaseLogout();
    setProfileState(null);
    setLogs([]);
    setTravelPlans([]);
    setChatMessages([]);
    setPredictionsState([]);
  };

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
      login,
      logout,
      isInitialized 
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
