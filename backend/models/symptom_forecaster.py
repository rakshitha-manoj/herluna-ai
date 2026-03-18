import torch
import torch.nn as nn

class MultiTaskForecaster(nn.Module):
    def __init__(self, input_dim=30, shared_dim=64):
        super(MultiTaskForecaster, self).__init__()
        # Shared Layer
        self.shared = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, shared_dim),
            nn.ReLU()
        )
        
        # Task 1: Mood Prediction (Regression)
        self.mood_head = nn.Linear(shared_dim, 1)
        
        # Task 2: Energy Prediction (Regression)
        self.energy_head = nn.Linear(shared_dim, 1)
        
        # Task 3: Symptom Probability (Classification - e.g. 5 symptoms)
        self.symptom_head = nn.Linear(shared_dim, 5)
        self.sigmoid = nn.Sigmoid()
        
    def forward(self, x):
        shared_out = self.shared(x)
        mood = self.mood_head(shared_out)
        energy = self.energy_head(shared_out)
        symptoms = self.sigmoid(self.symptom_head(shared_out))
        return mood, energy, symptoms
