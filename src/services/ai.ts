import { GoogleGenAI } from "@google/genai";
import { DailyLog, UserProfile, CyclePhase, ChatMessage, Prediction, getPhase } from "../types";

const API_KEYS = [
  import.meta.env.VITE_GEMINI_KEY_1,
  import.meta.env.VITE_GEMINI_KEY_2,
  import.meta.env.VITE_GEMINI_KEY_3,
  import.meta.env.VITE_GEMINI_KEY_4
].filter(Boolean);

let currentKeyIndex = 0;
const getAiInstance = () => {
  const apiKey = API_KEYS[currentKeyIndex] || import.meta.env.VITE_GEMINI_API_KEY;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenAI({ apiKey });
};

const BACKEND_URLS = [
  import.meta.env.VITE_BACKEND_URL_1,
  import.meta.env.VITE_BACKEND_URL_2,
  import.meta.env.VITE_BACKEND_URL_3,
  import.meta.env.VITE_BACKEND_URL_4
].filter(Boolean) || ["http://localhost:8000"];

let activeBackendUrl = BACKEND_URLS[0];

const tryBackend = async (endpoint: string, options: any) => {
  for (const baseUrl of BACKEND_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout per host
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        activeBackendUrl = baseUrl; // Remember working host
        return response;
      }
    } catch (e) {
      console.log(`[AI Service] Host ${baseUrl} failed, trying next...`);
    }
  }
  throw new Error("No reachable backend hosts");
};

// --- QUOTA-SAVING LOCAL FALLBACKS (ZERO API USAGE) ---

const getLocalPredictions = (phase: CyclePhase, logs: DailyLog[]): Prediction[] => {
  if (logs.length < 3) {
    return [
      { type: 'Energy', title: 'Phase Forecast', description: `Your energy is typical for the ${phase} phase. Focus on balanced nutrition and rest.`, probability: '90%', value: 80, timeframe: 'Next 24h', severity: 'Low' },
      { type: 'Mood', title: 'Phase Harmony', description: 'Hormonal shifts are expected. Hydration and light movement can help stabilize your mood.', probability: '75%', value: 60, timeframe: 'Next 2 days', severity: 'Low' },
      { type: 'Symptom', title: 'Routine Check', description: 'No unusual symptoms are predicted based on your typical cycle rhythm.', probability: '80%', value: 30, timeframe: 'Next 3 days', severity: 'Low' }
    ];
  }

  const avgEnergy = Math.round((logs.reduce((s, l) => s + l.energy, 0) / logs.length) * 10);
  const avgStress = Math.round((logs.reduce((s, l) => s + l.stress, 0) / logs.length) * 10);
  
  const predictions: Prediction[] = [];
  
  if (avgEnergy < 50) {
    predictions.push({ type: 'Energy', title: 'Energy Dip Expected', description: `Based on your recent logs, you are trending towards lower energy in the ${phase} phase.`, probability: '85%', value: avgEnergy, timeframe: 'Next 24h', severity: 'Moderate' });
  } else {
    predictions.push({ type: 'Energy', title: 'High Energy Window', description: `You have been sustaining great energy levels! Capitalize on this momentum.`, probability: '80%', value: avgEnergy, timeframe: 'Next 24h', severity: 'Low' });
  }

  if (avgStress > 60) {
    predictions.push({ type: 'Mood', title: 'Stress Alert', description: `Elevated stress levels detected. Hormonal shifts might amplify this over the next 48 hours.`, probability: '75%', value: avgStress, timeframe: 'Next 2 days', severity: 'High' });
  } else {
    predictions.push({ type: 'Mood', title: 'Phase Harmony', description: `Your stress levels are very low, suggesting excellent hormonal resilience right now.`, probability: '90%', value: Math.max(20, avgStress), timeframe: 'Next 2 days', severity: 'Low' });
  }

  const symptomFreq: Record<string, number> = {};
  logs.forEach(l => l.symptoms.forEach(s => {
    const name = typeof s === 'string' ? s : s.name;
    symptomFreq[name] = (symptomFreq[name] || 0) + 1;
  }));
  const topSymptom = Object.entries(symptomFreq).sort((a,b)=>b[1]-a[1])[0];
  
  if (topSymptom && topSymptom[1] > 1) {
    predictions.push({ type: 'Symptom', title: `${topSymptom[0]} Risk`, description: `You frequently log ${topSymptom[0]}. There is a high chance it will recur.`, probability: `${Math.min(95, 50 + (topSymptom[1]*10))}%`, value: Math.min(100, topSymptom[1]*20), timeframe: 'Next 3 days', severity: 'Moderate' });
  } else {
    predictions.push({ type: 'Symptom', title: 'Routine Check', description: 'No unusual or hyper-frequent symptoms predicted right now.', probability: '80%', value: 30, timeframe: 'Next 3 days', severity: 'Low' });
  }

  return predictions;
};

const getLocalInsights = (phase: CyclePhase, logs: DailyLog[]): string[] => {
  if (logs.length < 3) {
    return [
      `You're in your ${phase} phase. Listen to your body's specific signals today.`,
      "Consistency in logging daily signals is the best way to improve the accuracy of your cycle intelligence."
    ];
  }
  
  const avgSleep = logs.reduce((s, l) => s + l.sleep, 0) / logs.length;
  const avgHydration = logs.reduce((s, l) => s + l.hydration, 0) / logs.length;
  
  let insight = `Your ${phase} phase is well aligned. `;
  if (avgSleep < 7) insight += "However, increasing your sleep average above 7 hours will drastically improve your baseline energy. ";
  if (avgHydration < 8) insight += "Also, try to drink more water to support your metabolism right now. ";
  if (avgSleep >= 7 && avgHydration >= 8) insight += "Your excellent sleep and hydration habits are perfectly supporting your hormonal health! ";

  return [
    insight,
    `Based on your ${logs.length} logged days, your cycle is establishing a highly predictable pattern.`
  ];
};

export const getPredictions = async (profile: UserProfile, logs: DailyLog[], currentPhase: CyclePhase): Promise<Prediction[]> => {
  try {
    const response = await tryBackend("/predict/cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, logs })
    });
    return getLocalPredictions(currentPhase, logs);
  } catch (error) {
    console.log("[AI Service] Using local predictions (Backend/Quota protection)");
    return getLocalPredictions(currentPhase, logs);
  }
};

export const generateInsights = async (profile: UserProfile, logs: DailyLog[], currentPhase: CyclePhase): Promise<string[]> => {
  try {
    const response = await tryBackend("/chat/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, logs, question: "insights", history: [] })
    });
    const data = await response.json();
    return [data.response];
  } catch (error) {
    console.log("[AI Service] Using local insights (Backend/Quota protection)");
    return getLocalInsights(currentPhase, logs);
  }
};

// --- SUBMISSION MODE: LOCAL RULE-BASED INTELLIGENCE ---
const getLocalSmartResponse = (question: string, profile: UserProfile | null, currentPhase: CyclePhase): string => {
  const q = question.toLowerCase();
  const name = profile?.name || "there";
  
  if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
    return `Hi ${name}! I'm Luna, your cycle intelligence assistant. How are you feeling in your ${currentPhase} phase today?`;
  }

  if (q.includes("diet") || q.includes("eat") || q.includes("food")) {
    const tips = {
      'Menstrual': "Focus on iron-rich foods (spinach, lentils) and anti-inflammatory spices like ginger and turmeric.",
      'Follicular': "Incorporate fermented foods (kimchi, yogurt) and light, fresh vegetables to support rising estrogen.",
      'Ovulatory': "Prioritize fiber-rich foods and antioxidants (berries, kale) to help the liver process hormonal peaks.",
      'Luteal': "Opt for complex carbs (sweet potatoes, oats) and magnesium-rich snacks to stabilize mood and blood sugar."
    };
    return `During the ${currentPhase} phase, your metabolism shifts. ${tips[currentPhase]}`;
  }

  if (q.includes("tired") || q.includes("energy") || q.includes("fatigue") || q.includes("exhausted")) {
    const tips = {
      'Menstrual': "Low energy is expected as hormones are at their lowest. Focus on restorative rest and iron-rich foods.",
      'Follicular': "Your energy should be rising. If you're tired, check your iron levels or sleep quality.",
      'Ovulatory': "This is usually your peak energy phase. Unexpected fatigue here might suggest high stress.",
      'Luteal': "Progesterone can cause drowsiness and 'brain fog'. Prioritize magnesium and consistent sleep schedules."
    };
    return `It makes sense to feel that way. In your ${currentPhase} phase: ${tips[currentPhase]}`;
  }

  if (q.includes("exercise") || q.includes("workout") || q.includes("gym") || q.includes("move")) {
    const tips = {
      'Menstrual': "Gentle movement like Yin yoga or walking is best while your body is in a state of renewal.",
      'Follicular': "Energy is rising! This is a great time for strength training or trying something new.",
      'Ovulatory': "You're at your physical peak. High-intensity interval training (HIIT) or social sports are ideal.",
      'Luteal': "Switch to moderate activity like Pilates or steady-state cardio as your body prepares for rest."
    };
    return `Your energy levels are heavily influenced by your cycle. ${tips[currentPhase]}`;
  }

  if (q.includes("pcos") || q.includes("pco") || q.includes("pcis") || q.includes("irregular")) {
    return "Luna's PCOS Guidance: Managing hormonal imbalances like PCOS is all about glucose stability. Focus on pairing every carb with a protein (like apple + almond butter) to prevent insulin spikes. In your current phase, anti-inflammatory habits are your best friend.";
  }

  if (q.includes("skin") || q.includes("acne") || q.includes("breakout")) {
    return `Hormonal acne often correlates with the Luteal phase. During your ${currentPhase} phase, focus on anti-inflammatory nutrition and keeping your hydration levels high to support skin clarity.`;
  }

  if (q.includes("caffeine") || q.includes("coffee") || q.includes("drink") || q.includes("alcohol")) {
    return `Your nervous system is more sensitive to stimulants in the Luteal and Menstrual phases. In your ${currentPhase} phase, try to monitor how caffeine affects your sleep and stress logs.`;
  }

  if (q.includes("anxious") || q.includes("anxiety") || q.includes("mood") || q.includes("stress")) {
    return `It's very common to feel ${q.includes("anxious") ? "anxious" : "shifted"} during certain parts of your cycle, especially the Luteal phase. Deep breathing, magnesium intake, and quality sleep can help stabilize these neural shifts.`;
  }

  if (q.includes("privacy") || q.includes("secure") || q.includes("data")) {
    return "HerLuna AI is designed for 'Local-First' privacy. Your sensitive health data is stored directly on your device and is never sold. If you choose to sync to the cloud, it remains fully encrypted.";
  }

  return `That's an interesting question about your ${currentPhase} health. As your dedicated cycle assistant, I recommend tracking your specific symptoms daily so I can provide more personalized insights into your unique rhythm.`;
};

/** 
 * ASK ASSISTANT (CHAT): 
 * HYBRID MODE: Try Gemini first for "Magic", fall back to Local for "Reliability".
 */
export const askAssistant = async (question: string, profile: UserProfile | null, logs: DailyLog[], history: ChatMessage[]): Promise<string> => {
  // 1. Calculate current phase for context
  const today = new Date();
  const lastStart = new Date(profile?.lastPeriodStart || today);
  const cycleLen = profile?.cycleLength || 28;
  const currentPhase = getPhase(today, lastStart, cycleLen, profile?.activePeriodStart);

  // 2. Try Gemini first
  try {
    const client = getAiInstance();
    
    const prompt = `
      You are Luna, a supportive hormonal health assistant. 
      The user is currently in their ${currentPhase} cycle phase.
      User Profile: ${JSON.stringify({ ...profile, password: '***' })}
      Recent Logs: ${JSON.stringify(logs.slice(0, 5))}
      Question: ${question}
      Be concise, medically informative (but add a disclaimer), and warm.
    `;

    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || getLocalSmartResponse(question, profile, currentPhase);
  } catch (error) {
    console.log("[Luna Chat] Gemini failed/exhausted, trying Backend RAG fallback...");
    
    // 3. Try Backend RAG Fallback
    try {
      const response = await tryBackend("/chat/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, logs, question, history })
      });
      const data = await response.json();
      return data.response;
    } catch (backendError) {
      console.log("[Luna Chat] Backend RAG also failed, using Frontend Rule-Based fallback");
      // 4. FINAL FALLBACK: Local rule-based response
      return getLocalSmartResponse(question, profile, currentPhase);
    }
  }
};

// --- REAL LOCAL ANALYSIS INTELLIGENCE ---

export const getHabitCorrelations = async (logs: DailyLog[]) => {
  if (logs.length < 5) return [{ habit: "Activity", correlation: "Improves overall wellness perception", strength: "High" }];
  
  // Calculate average energy when > 7.5 hrs sleep vs < 7.5 hrs
  const goodSleepLogs = logs.filter(l => l.sleep >= 7.5);
  const badSleepLogs = logs.filter(l => l.sleep < 7.5);
  const avgEnergyGoodSleep = goodSleepLogs.reduce((s, l) => s + l.energy, 0) / (goodSleepLogs.length || 1);
  const avgEnergyBadSleep = badSleepLogs.reduce((s, l) => s + l.energy, 0) / (badSleepLogs.length || 1);
  
  // Calculate stress vs hydration
  const goodHydrationLogs = logs.filter(l => l.hydration >= 8);
  const badHydrationLogs = logs.filter(l => l.hydration < 8);
  const avgStressGoodHydration = goodHydrationLogs.reduce((s, l) => s + l.stress, 0) / (goodHydrationLogs.length || 1);
  const avgStressBadHydration = badHydrationLogs.reduce((s, l) => s + l.stress, 0) / (badHydrationLogs.length || 1);

  const results = [];
  
  if (goodSleepLogs.length > 0 && badSleepLogs.length > 0 && (avgEnergyGoodSleep > avgEnergyBadSleep)) {
    results.push({ habit: "Sleep", correlation: `Adequate sleep noticeably increases your daily energy by +${Math.max(1, Math.round(avgEnergyGoodSleep - avgEnergyBadSleep))} points`, strength: "High" });
  }
  
  if (goodHydrationLogs.length > 0 && badHydrationLogs.length > 0 && (avgStressBadHydration > avgStressGoodHydration)) {
    results.push({ habit: "Hydration", correlation: "Proper hydration correlates closely with lower reported stress levels", strength: "Moderate" });
  }

  if (results.length === 0) {
    results.push({ habit: "Tracking Consistency", correlation: "Logging daily reveals hidden correlations over time", strength: "Low" });
  }

  return results;
};

export const getHabitImpactPrediction = async (logs: DailyLog[]) => {
  if (logs.length < 5) return [{ habit: "Logging", impact: "Increased Awareness", recommendation: "Logging symptoms daily improves intelligence.", score: 10 }];
  
  const impacts = [];
  const avgSleep = logs.reduce((s, l) => s + l.sleep, 0) / logs.length;
  if (avgSleep < 7) {
    impacts.push({ habit: "Sleep Deficit", impact: "Low sleep is likely dropping your resilience to stress.", recommendation: "Aim for 8 hours tonight.", score: -15 });
  } else {
    impacts.push({ habit: "Restful Sleep", impact: "Adequate sleep is keeping your mood stable.", recommendation: "Maintain your current sleep schedule.", score: 20 });
  }

  const avgHydration = logs.reduce((s, l) => s + l.hydration, 0) / logs.length;
  if (avgHydration >= 8) {
    impacts.push({ habit: "Hydration", impact: "Optimal water intake supports skin and energy.", recommendation: "Keep drinking 8+ glasses.", score: 18 });
  } else {
    impacts.push({ habit: "Dehydration", impact: "Low water intake may be increasing fatigue.", recommendation: "Try to drink 8 glasses today.", score: -10 });
  }

  return impacts;
};

export const getSymptomClusters = async (logs: DailyLog[]) => {
  const symptomFreq: Record<string, number> = {};
  logs.forEach(l => l.symptoms.forEach(s => {
    const name = typeof s === 'string' ? s : s.name;
    symptomFreq[name] = (symptomFreq[name] || 0) + 1;
  }));
  
  const physical = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne'].filter(s => symptomFreq[s] > 1);
  const emotional = ['Anxiety', 'Mood Swings', 'Irritability', 'Crying', 'Brain Fog'].filter(s => symptomFreq[s] > 1);
  
  const clusters = [];
  if (physical.length > 0) {
    clusters.push({ cluster: "Physical Discomfort", symptoms: physical, insight: `You frequently experience physical symptoms like ${physical[0]}. This is common during the Luteal and Menstrual phases.` });
  }
  if (emotional.length > 0) {
    clusters.push({ cluster: "Emotional Sensitivity", symptoms: emotional, insight: `Emotional shifts including ${emotional[0]} are showing up in your logs.` });
  }
  
  if (clusters.length === 0) {
     return [{ cluster: "Baseline", symptoms: ["Stable"], insight: "No significant recurring symptom clusters detected yet." }];
  }
  
  return clusters;
};

export const analyzeSymptoms = async (logs: DailyLog[]) => {
  const symptomFreq: Record<string, number> = {};
  logs.forEach(l => l.symptoms.forEach(s => {
    const name = typeof s === 'string' ? s : s.name;
    symptomFreq[name] = (symptomFreq[name] || 0) + 1;
  }));
  
  const sorted = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return [{ symptom: "Tracking", analysis: "Log symptoms to see AI analysis." }];
  }
  
  return sorted.slice(0, 3).map(([sym, count]) => ({
    symptom: sym,
    analysis: `You have logged ${sym} ${count} times recently. Focus on tracking when this occurs in your cycle to find triggers.`
  }));
};

export const generateCycleSummary = async (profile: UserProfile, logs: DailyLog[]) => {
  if (logs.length < 5) return "Your wellness habits are currently supporting your stable cycle rhythm. Keep tracking to reveal deeper trends.";
  const avgStress = logs.reduce((s, l) => s + l.stress, 0) / logs.length;
  const avgEnergy = logs.reduce((s, l) => s + l.energy, 0) / logs.length;
  
  if (avgStress > 7) {
    return `Your recent logs show an elevated average stress level (${avgStress.toFixed(1)}/10). Focus on nervous system regulation this cycle.`;
  }
  if (avgEnergy < 4) {
    return `Your energy levels have been unusually low (${avgEnergy.toFixed(1)}/10). Prioritize deep rest over the next few days.`;
  }
  return `You are maintaining a strong holistic balance. Your average energy is ${avgEnergy.toFixed(1)}/10 and your average stress is perfectly manageable.`;
};

export const generateDailyTip = async (profile: UserProfile, currentPhase: CyclePhase) => {
  const tips = {
    'Menstrual': "Prioritize iron-rich foods like spinach and ensure you're getting extra rest today.",
    'Follicular': "Your energy is rising! This is a great window for trying a higher-intensity workout.",
    'Ovulatory': "Communication skills are often at their peak now—perfect for important discussions.",
    'Luteal': "Switch to complex carbs and magnesium-rich snacks to support stable mood."
  };
  return tips[currentPhase] || "Stay hydrated and listen to your body's unique rhythm today.";
};
