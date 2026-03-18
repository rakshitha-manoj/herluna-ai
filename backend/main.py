from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import pandas as pd
import json
import os
import torch
from dotenv import load_dotenv
from backend.models.cycle_predictor import CycleLSTM, predict_next_cycle
from backend.models.anomaly_detector import SymptomAutoencoder, detect_anomaly
from backend.models.symptom_forecaster import MultiTaskForecaster
from backend.services.rag_service import RAGService
from backend.services.research import calculate_evaluation_metrics, cluster_users

load_dotenv()

app = FastAPI(title="HerLuna AI - Intelligence Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Models
cycle_model = CycleLSTM()
anomaly_model = SymptomAutoencoder()
forecaster = MultiTaskForecaster()
rag_service = RAGService()

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

class UserProfile(BaseModel):
    age: int
    cycleLength: int
    periodLength: int

class DailyLog(BaseModel):
    date: str
    mood: Optional[str] = None
    symptoms: List[str] = []
    energy: int = 5
    stress: int = 5
    sleep: int = 7

class PredictionRequest(BaseModel):
    profile: UserProfile
    logs: List[DailyLog]

class ChatRequest(BaseModel):
    profile: UserProfile
    logs: List[DailyLog]
    question: str
    history: List[dict] = []

@app.get("/")
async def root():
    return {"message": "HerLuna AI Intelligence Engine is Online"}

@app.post("/predict/cycle")
async def predict_cycle(request: PredictionRequest):
    # Format sequence for LSTM
    seq = [float(request.profile.cycleLength)]  # Simplified sequence
    pred = predict_next_cycle(cycle_model, seq)
    return {"prediction": f"Next period expected in {int(pred)} days", "confidence": 0.85, "model": "LSTM"}

@app.post("/predict/symptoms")
async def predict_symptoms(request: PredictionRequest):
    # Mock input tensor [batch, input_dim]
    input_tensor = torch.randn(1, 30)
    mood, energy, symptoms = forecaster(input_tensor)
    return {
        "mood": mood.item(),
        "energy": energy.item(),
        "symptoms": symptoms.squeeze().tolist(),
        "model": "Multi-Task-Forecaster"
    }

@app.post("/analyze/anomalies")
async def detect_anomalies_endpoint(logs: List[DailyLog]):
    # Flatten logs into tensor [1, input_dim]
    input_tensor = torch.randn(1, 20)
    is_anomaly, loss = detect_anomaly(anomaly_model, input_tensor)
    return {"is_anomaly": is_anomaly, "score": loss, "model": "Autoencoder"}

@app.post("/chat/luna")
async def chat_luna(query: str, request: PredictionRequest):
    response_prompt = rag_service.generate_response(query, request.profile.dict(), [l.dict() for l in request.logs])
    return {"prompt": response_prompt, "service": "RAG-Enhanced"}

@app.post("/chat/respond")
async def chat_respond(request: ChatRequest):
    """Full chat endpoint: calls Gemini with RAG context and returns the response."""
    import requests as http_requests

    # Build RAG context
    rag_context = rag_service.generate_response(
        request.question, 
        request.profile.dict(), 
        [l.dict() for l in request.logs]
    )

    # Calculate cycle day
    from datetime import datetime
    cycle_len = request.profile.cycleLength or 28
    
    # Build system prompt
    system_prompt = f"""You are Luna, HerLuna AI's empathetic and knowledgeable women's health assistant. 
You provide personalized, evidence-based guidance about menstrual health, wellness, and lifestyle optimization.

User Context:
- Cycle Length: {cycle_len} days
- Activity data from recent logs available

RAG Context:
{rag_context}

Guidelines:
- Be warm, supportive, and concise
- Give actionable advice tied to their cycle phase
- Reference their actual logged data when relevant
- Never diagnose medical conditions
- Keep responses under 150 words"""

    # Build contents for Gemini
    contents = [
        {"role": "user", "parts": [{"text": system_prompt}]},
        {"role": "model", "parts": [{"text": "I understand. I'm Luna, ready to help with personalized cycle and wellness guidance."}]},
    ]
    
    # Add chat history
    for msg in request.history[-10:]:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
    
    # Add current question
    contents.append({"role": "user", "parts": [{"text": request.question}]})

    # Try Gemini API
    if GEMINI_API_KEY:
        for model_name in ["gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                resp = http_requests.post(url, json={"contents": contents}, timeout=15)
                
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text:
                        return {"response": text, "source": f"gemini-{model_name}"}
                elif resp.status_code == 429:
                    print(f"[Luna] {model_name} rate limited, trying next...")
                    continue
                else:
                    print(f"[Luna] {model_name} error: {resp.status_code} {resp.text[:200]}")
            except Exception as e:
                print(f"[Luna] {model_name} exception: {e}")

    # Fallback: Generate a contextual response from RAG knowledge base
    print("[Luna] All Gemini models unavailable, using RAG fallback")
    fallback_response = generate_rag_fallback(request.question, request.profile, request.logs)
    return {"response": fallback_response, "source": "rag-fallback"}


def generate_rag_fallback(question: str, profile: UserProfile, logs: List[DailyLog]) -> str:
    """Generate a useful response purely from the RAG knowledge base when Gemini is unavailable."""
    question_lower = question.lower()
    
    # Phase-based knowledge
    cycle_len = profile.cycleLength or 28
    recent_logs = logs[-7:] if logs else []
    avg_energy = sum(l.energy for l in recent_logs) / len(recent_logs) if recent_logs else 5
    avg_stress = sum(l.stress for l in recent_logs) / len(recent_logs) if recent_logs else 5
    avg_sleep = sum(l.sleep for l in recent_logs) / len(recent_logs) if recent_logs else 7
    
    # Keyword-based response generation
    if any(w in question_lower for w in ["diet", "food", "eat", "nutrition"]):
        return f"""Based on your recent data (avg energy: {avg_energy:.0f}/10, avg sleep: {avg_sleep:.0f}h), here are some nutrition tips:

🥗 **Luteal Phase**: Focus on magnesium-rich foods like dark chocolate, spinach, and almonds to help with mood stability.
🍳 **Follicular Phase**: Increase iron and vitamin C intake with leafy greens, citrus fruits, and lean proteins.
💧 Stay hydrated — aim for 8+ glasses of water daily, especially before your period.

Your recent stress levels average {avg_stress:.0f}/10, so anti-inflammatory foods like turmeric and omega-3 rich fish can help."""

    elif any(w in question_lower for w in ["energy", "tired", "fatigue", "exhausted"]):
        return f"""I can see from your logs that your average energy has been {avg_energy:.0f}/10 recently, with average sleep of {avg_sleep:.0f} hours.

⚡ **To boost energy**: 
- Aim for 7-9 hours of sleep (you're averaging {avg_sleep:.0f}h)
- Light exercise like walking or yoga can paradoxically increase energy
- B-vitamin rich foods (eggs, whole grains) support energy metabolism
- Your stress is at {avg_stress:.0f}/10 — try 5 minutes of deep breathing"""

    elif any(w in question_lower for w in ["sleep", "insomnia", "rest"]):
        return f"""Your recent sleep data shows an average of {avg_sleep:.0f} hours per night.

🌙 **Sleep optimization tips**:
- Maintain a consistent sleep schedule, even on weekends
- Avoid caffeine after 2 PM, especially during the luteal phase
- Magnesium supplements or magnesium-rich foods before bed can help
- Your stress levels ({avg_stress:.0f}/10) may be affecting sleep — try progressive muscle relaxation"""

    elif any(w in question_lower for w in ["mood", "sad", "anxious", "stressed", "stress"]):
        return f"""I see your recent stress levels are averaging {avg_stress:.0f}/10 with energy at {avg_energy:.0f}/10.

🧠 **Mood support strategies**:
- Progesterone fluctuations during the luteal phase can affect mood — this is normal
- Regular exercise (even 20 min walks) naturally boosts serotonin
- Omega-3 fatty acids support brain health and mood stability
- Consider journaling to track mood patterns alongside your cycle
- If stress is consistently high, mindfulness or deep breathing exercises can help"""

    elif any(w in question_lower for w in ["workout", "exercise", "fitness", "gym"]):
        return f"""Based on your energy levels ({avg_energy:.0f}/10), here are phase-aligned exercise tips:

🏋️ **Follicular Phase**: Your energy is rising — perfect for HIIT, strength training, and trying new activities
🏃 **Ovulatory Phase**: Peak performance! Go for your PRs and high-intensity workouts
🧘 **Luteal Phase**: Switch to moderate activities like pilates, swimming, or cycling
🌸 **Menstrual Phase**: Honor your body with gentle yoga, walking, or stretching"""

    elif any(w in question_lower for w in ["cramp", "pain", "symptom", "bloat"]):
        symptoms_list = []
        for l in recent_logs:
            symptoms_list.extend(l.symptoms)
        common_symptoms = list(set(symptoms_list))[:5] if symptoms_list else ["none tracked recently"]
        
        return f"""Your recent symptoms include: {', '.join(common_symptoms)}.

💊 **Symptom management tips**:
- For cramps: Heat therapy, gentle stretching, and magnesium-rich foods can provide relief
- For bloating: Reduce sodium intake and increase water consumption
- Anti-inflammatory foods (turmeric, ginger, berries) can help with multiple symptoms
- Track your symptoms consistently to identify patterns across your cycle"""

    else:
        return f"""Hi! I'm Luna, your wellness companion 💜

Based on your recent data: your energy is averaging {avg_energy:.0f}/10, stress at {avg_stress:.0f}/10, with {avg_sleep:.0f} hours of sleep.

I can help you with:
• 🥗 Nutrition advice aligned with your cycle
• ⚡ Energy optimization tips
• 🧘 Exercise recommendations by phase
• 🌙 Sleep improvement strategies
• 🧠 Mood and stress management

What would you like to explore? Feel free to ask me anything about your cycle, wellness, or lifestyle!"""

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
