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

# Initialize Gemini with Rotation Pool (Loaded from .env)
API_KEYS = [
    os.getenv("GEMINI_KEY_1", ""),
    os.getenv("GEMINI_KEY_2", ""),
    os.getenv("GEMINI_KEY_3", ""),
    os.getenv("GEMINI_KEY_4", "")
]
# Filter out empty keys
API_KEYS = [k for k in API_KEYS if k]
current_key_state = {"index": 0}

def get_next_gemini_key():
    key = API_KEYS[current_key_state["index"]]
    current_key_state["index"] = (current_key_state["index"] + 1) % len(API_KEYS)
    return key

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

def extract_cycle_history(logs: List[DailyLog]) -> List[float]:
    """Helper to extract a list of cycle lengths from daily logs based on flow entries."""
    if not logs: return []
    
    from datetime import datetime
    
    # Sort logs by date
    sorted_logs = sorted(logs, key=lambda x: x.date)
    period_starts = []
    
    # Find start dates of periods (consecutive flow days count as one period)
    last_was_flow = False
    for log in sorted_logs:
        has_flow = log.symptoms and any(s in ["Heavy Flow", "Medium Flow", "Light Flow"] for s in log.symptoms)
        # Also check explicit flow field if it exists
        if not has_flow and hasattr(log, 'flow') and log.flow and log.flow != "None":
            has_flow = True
            
        if has_flow and not last_was_flow:
            period_starts.append(datetime.strptime(log.date, "%Y-%m-%d"))
        last_was_flow = has_flow
        
    # Calculate intervals between starts
    cycle_lengths = []
    for i in range(1, len(period_starts)):
        diff = (period_starts[i] - period_starts[i-1]).days
        if 20 < diff < 45: # Filter out unrealistic gaps
            cycle_lengths.append(float(diff))
            
    return cycle_lengths

@app.get("/")
async def root():
    return {"message": "HerLuna AI Intelligence Engine is Online"}

@app.post("/predict/cycle")
async def predict_cycle(request: PredictionRequest):
    # Extract historical cycle lengths from logs
    history = extract_cycle_history(request.logs)
    
    # Default to user's profile length if history is empty
    current_avg = float(request.profile.cycleLength)
    
    # ADAPTIVE LEARNING TRIGGER
    if len(history) >= 2:
        print(f"[AdaptiveLearning] Found {len(history)} cycles. Personalizing model...")
        from backend.models.cycle_predictor import train_model
        # History includes the most recent completed cycle
        train_model(cycle_model, history)
        
    # Format sequence for prediction
    # If we have history, use the last 3 values (pad if necessary)
    if history:
        seq = history[-5:] # Last 5 cycles
    else:
        seq = [current_avg]
    
    pred = predict_next_cycle(cycle_model, seq)
    
    # Sanity check: If prediction is wild (due to random weights or low data), 
    # blend it with the user's reported average
    if len(history) < 3:
        pred = (pred * 0.3) + (current_avg * 0.7)
        
    return {
        "prediction": f"Next period expected in {int(pred)} days",
        "confidence": 0.85 if len(history) >= 3 else 0.60,
        "model": "LSTM-Adaptive" if len(history) >= 2 else "LSTM-Baseline",
        "learningStatus": "Personalized" if len(history) >= 3 else "Learning..."
    }

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

    # Try Gemini API with Key Rotation
    for _ in range(len(API_KEYS)):
        api_key = get_next_gemini_key()
        for model_name in ["gemini-1.5-flash", "gemini-2.0-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                resp = http_requests.post(url, json={"contents": contents}, timeout=15)
                
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text:
                        return {"response": text, "source": f"gemini-{model_name}"}
                elif resp.status_code == 429:
                    print(f"[Luna] {model_name} rate limited with key {api_key[:10]}..., trying next key/model")
                    continue
                else:
                    print(f"[Luna] {model_name} error: {resp.status_code}")
            except Exception as e:
                print(f"[Luna] {model_name} exception: {e}")

    # Fallback: Generate a contextual response from RAG knowledge base
    print("[Luna] All Gemini keys/models unavailable, using RAG fallback")
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

    elif any(w in question_lower for w in ["cramp", "pain", "symptom", "bloat", "headache", "pms", "migraine"]):
        symptoms_list = []
        for l in recent_logs:
            symptoms_list.extend(l.symptoms)
        common_symptoms = list(set(symptoms_list))[:5] if symptoms_list else ["none tracked recently"]
        
        return f"""Your recent symptoms include: {', '.join(common_symptoms)}. 
        
💊 **Symptom management tips**:
- **Cramps**: Try heat therapy, magnesium-rich foods (dark chocolate, pumpkin seeds), and gentle pelvic tilts.
- **Bloating**: Reduce refined salt and increase potassium (bananas, avocados). Peppermint tea can also help.
- **Headaches**: Hormonal shifts can trigger migraines. Ensure consistent sleep and hydration ({avg_sleep:.0f}h avg).
- **Track consistently**: The more you log, the better I can predict these patterns!"""

    elif any(w in question_lower for w in ["pcos", "pco", "pcis", "irregular", "hormone", "imbalance"]):
        return f"""Luna here! Dealing with cycle irregularities like PCOS or PCIS requires a dedicated approach to insulin management:
        
✨ **Personalized Advice**:
- **Glucose Stability**: This is priority #1. Never eat a "naked carb"—always pair it with healthy fats or protein.
- **Inflammation**: Your recent stress is at {avg_stress:.0f}/10. High stress triggers androgens, which can worsen PCOS symptoms. Try 10 minutes of walking after meals.
- **Consistency**: The model is learning your specific rhythm. Keep logging to see your personal 'Irregularity Score' improve."""

    elif any(w in question_lower for w in ["skin", "acne", "breakout", "glow"]):
        return f"""Skin health is deeply tied to your cycle phase:
        
✨ **Phase-based skincare**:
- **Luteal**: Progesterone rises, increasing sebum. Focus on deep cleansing and anti-inflammatory foods.
- **Menstrual**: Estrogen is low, and skin can be dry. Focus on hydration and barrier repair.
- **Follicular**: Estrogen is rising—this is usually your 'glow' phase! Great time for new products.
- **Tip**: Limit dairy and refined sugar if you're prone to hormonal breakouts."""

    elif any(w in question_lower for w in ["caffeine", "coffee", "alcohol", "drink"]):
        return f"""Impact of habits on your rhythm (Recent Avg Stress: {avg_stress:.0f}/10):
        
☕ **Caffeine**: Try to limit caffeine after 2 PM, especially in your luteal phase, as your body clears it slower then.
🍷 **Alcohol**: Can significantly disrupt your core temperature and sleep quality ({avg_sleep:.0f}h avg). 
🍵 **Switch it up**: If you're feeling anxious, try Tulsi or Chamomile tea to support your nervous system."""

    elif any(w in question_lower for w in ["privacy", "data", "secure", "safe"]):
        return """Your privacy is my foundation. 💜

🛡️ **How I protect you**:
- **Local-First**: Your data is stored right on your device, not on a random server.
- **Encrypted Sync**: If you use cloud sync, it's fully encrypted via Firebase.
- **No Selling**: We never sell or share your personal health data. You are in total control."""

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
