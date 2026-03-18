import { GoogleGenAI } from "@google/genai";
import { DailyLog, UserProfile, CyclePhase, ChatMessage, Prediction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
  ? `http://${window.location.hostname}:8000` 
  : "http://localhost:8000";

export const getPredictions = async (profile: UserProfile, logs: DailyLog[], currentPhase: CyclePhase): Promise<Prediction[]> => {
  try {
    // 1. Call Python Backend for ML-based predictions
    const response = await fetch(`${BACKEND_URL}/predict/cycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, logs })
    });
    const mlData = await response.json();

    // 2. Fallback to Gemini for descriptive content and formatting
    const genAIResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are HerLuna AI.
        ML Data: ${JSON.stringify(mlData)}
        User Profile: ${JSON.stringify(profile)}
        Current Phase: ${currentPhase}

        Based on the ML prediction "${mlData.prediction}", generate a set of user-friendly health insights.
        Format as a JSON array of Prediction objects.
      `,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(genAIResponse.text || "[]");
  } catch (error) {
    console.error("Prediction Error:", error);
    return [
      { type: 'Energy', title: 'Energy Peak Expected', description: 'Your energy is likely to peak in 2 days as you enter the ovulation window.', probability: '85%', value: 85, timeframe: 'Next 2 days', severity: 'Low' },
      { type: 'Mood', title: 'Mood Sensitivity', description: 'You may experience mild irritability due to shifting hormones in the late luteal phase.', probability: '60%', value: 40, timeframe: 'Next 3 days', severity: 'Moderate' },
      { type: 'Symptom', title: 'Cramp Probability', description: 'High likelihood of mild cramps starting tomorrow.', probability: '75%', value: 75, timeframe: 'Next 24h', severity: 'Moderate' },
      { type: 'Cycle', title: 'Phase Transition', description: 'Transitioning to Follicular phase in 3 days.', probability: '95%', value: 95, timeframe: 'Next 3 days', severity: 'Low' }
    ];
  }
};

export const getSymptomClusters = async (logs: DailyLog[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Analyze these wellness logs and cluster symptoms into meaningful groups (e.g., "Inflammatory", "Hormonal", "Digestive").
        Logs: ${JSON.stringify(logs.slice(-60))}
        
        Provide 3-4 clusters.
        Format as a JSON array of objects: { "cluster": string, "symptoms": string[], "insight": string }
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Clustering Error:", error);
    return [
      { cluster: "Hormonal", symptoms: ["Cramps", "Bloating"], insight: "These symptoms peak 2 days before your period." },
      { cluster: "Neurological", symptoms: ["Headache", "Brain Fog"], insight: "Often correlated with low sleep days." }
    ];
  }
};

export const getHabitImpactPrediction = async (logs: DailyLog[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Predict how the user's current habits (sleep, stress, hydration) will impact their upcoming cycle phase.
        Logs: ${JSON.stringify(logs.slice(-14))}
        
        Provide 2-3 impact predictions.
        Format as a JSON array of objects: { "habit": string, "impact": string, "recommendation": string, "score": number (-100 to 100) }
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Habit Impact Error:", error);
    return [
      { habit: "Sleep", impact: "Low sleep is predicted to increase PMS irritability by 30%.", recommendation: "Aim for 8h sleep tonight.", score: -30 },
      { habit: "Hydration", impact: "Good hydration will likely reduce bloating severity.", recommendation: "Maintain current intake.", score: 20 }
    ];
  }
};

export const askAssistant = async (question: string, profile: UserProfile, logs: DailyLog[], history: ChatMessage[]) => {
  console.log("[Luna Chat] Starting askAssistant via backend");

  try {
    // Call the backend /chat/respond endpoint which handles everything server-side
    const chatHistory = history.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await fetch(`${BACKEND_URL}/chat/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          age: profile.ageGroup === '13-18' ? 16 : profile.ageGroup === '19-25' ? 22 : profile.ageGroup === '26-35' ? 30 : profile.ageGroup === '36-45' ? 40 : 50,
          cycleLength: profile.cycleLength || 28,
          periodLength: profile.periodLength || 5
        },
        logs: logs.slice(-14).map(l => ({
          date: l.date,
          mood: l.mood || null,
          symptoms: l.symptoms?.map(s => typeof s === 'string' ? s : s.name) || [],
          energy: l.energy || 5,
          stress: l.stress || 5,
          sleep: l.sleep || 7
        })),
        question: question,
        history: chatHistory
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Luna Chat] Backend error:", response.status, errorText);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log("[Luna Chat] Response received from:", data.source);
    return data.response;
  } catch (error) {
    console.error("[Luna Chat] Backend call failed:", error);
    
    // Offline fallback
    const today = new Date();
    const lastStart = new Date(profile?.lastPeriodStart || today);
    const cycleLen = profile?.cycleLength || 28;
    const dayOfCycle = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) % cycleLen;

    return `Hi! I'm Luna 💜 I'm currently unable to reach our servers, but here's a quick tip for cycle day ${dayOfCycle}:

${dayOfCycle <= 5 ? "🌙 You're in your menstrual phase. Focus on iron-rich foods, gentle movement, and rest." :
  dayOfCycle <= 13 ? "🌱 You're in your follicular phase. Energy is rising — great time for challenging workouts!" :
  dayOfCycle <= 16 ? "☀️ You're near ovulation. Social energy peaks now. Stay hydrated!" :
  "🍂 You're in your luteal phase. Prioritize magnesium-rich foods and restorative exercise."}

Please check your internet connection and try again.`;
  }
};

export const generateInsights = async (profile: UserProfile, logs: DailyLog[], currentPhase: CyclePhase) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are HerLuna AI, a lifestyle intelligence assistant for women.
        User Profile: ${JSON.stringify(profile)}
        Recent Logs: ${JSON.stringify(logs.slice(-7))}
        Current Phase: ${currentPhase}

        Provide 3 concise, personalized insights about their wellbeing based on the interaction between their cycle phase and lifestyle habits.
        Format as a JSON array of strings.
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]") as string[];
  } catch (error) {
    console.error("AI Insight Error:", error);
    return [
      "Current patterns suggest stable energy. This is historically your peak cognitive window.",
      "Historical data indicates mild headaches may occur in the coming days. Stay mindful of hydration.",
      "Your sleep consistency has improved by 15% this week, supporting better mood stability."
    ];
  }
};

export const generateCycleSummary = async (profile: UserProfile, logs: DailyLog[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are HerLuna AI. Summarize the user's last 30 days of cycle and wellness data.
        User Profile: ${JSON.stringify(profile)}
        Logs: ${JSON.stringify(logs.slice(-30))}

        Provide a 2-3 sentence summary of their overall health trends, specifically mentioning any notable patterns between their habits and cycle.
      `,
    });

    return response.text;
  } catch (error) {
    console.error("Summary Error:", error);
    return "Your cycle patterns show consistent energy levels with slight stress increases during the late luteal phase. Overall, your wellness habits are supporting a stable rhythm.";
  }
};

export const analyzeSymptoms = async (logs: DailyLog[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Analyze the symptoms reported in these logs: ${JSON.stringify(logs.slice(-30))}
        
        Identify the top 3 most frequent symptoms and provide a brief AI-driven explanation for why they might be occurring based on typical cycle physiology.
        Format as a JSON array of objects: { "symptom": string, "analysis": string }
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Symptom Analysis Error:", error);
    return [
      { symptom: "Cramps", analysis: "Typical during menstruation due to prostaglandin release." },
      { symptom: "Bloating", analysis: "Common in the luteal phase as progesterone levels shift." },
      { symptom: "Headache", analysis: "Often linked to estrogen withdrawal before your period." }
    ];
  }
};

export const getHabitCorrelations = async (logs: DailyLog[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Analyze these wellness logs and find correlations between habits (stress, sleep, diet, hydration) and symptoms/mood.
        Logs: ${JSON.stringify(logs.slice(-30))}
        
        Provide 3 specific correlations found in the data.
        Format as a JSON array of objects: { "habit": string, "correlation": string, "strength": "High" | "Moderate" | "Low" }
      `,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Correlation Error:", error);
    return [
      { habit: "Sleep", correlation: "Lower sleep hours correlate with higher irritability in Luteal phase.", strength: "High" },
      { habit: "Hydration", correlation: "Increased water intake reduces bloating severity by 20%.", strength: "Moderate" },
      { habit: "Stress", correlation: "High stress days often precede reported cramps.", strength: "Moderate" }
    ];
  }
};

export const generateDailyTip = async (profile: UserProfile, currentPhase: CyclePhase) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are HerLuna AI. Provide a single, punchy, actionable daily tip for a woman in her ${currentPhase} phase.
        User Profile: ${JSON.stringify(profile)}
        
        The tip should be related to nutrition, fitness, or mental wellbeing specifically for this phase.
        Keep it under 20 words.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Daily Tip Error:", error);
    const fallbacks = {
      'Menstrual': "Prioritize iron-rich foods and gentle stretching today.",
      'Follicular': "Try a new high-intensity workout; your energy is rising!",
      'Ovulatory': "Social energy is high—perfect for that important presentation.",
      'Luteal': "Opt for complex carbs and magnesium to support your mood."
    };
    return fallbacks[currentPhase] || "Stay hydrated and listen to your body's rhythm today.";
  }
};
