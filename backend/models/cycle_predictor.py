import torch
import torch.nn as nn
import numpy as np

class CycleLSTM(nn.Module):
    def __init__(self, input_size=10, hidden_size=64, num_layers=2, output_size=1):
        super(CycleLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

def train_model(model, history, epochs=50):
    """
    Trains the CycleLSTM model on a sequence of historical cycle lengths.
    history: List of floats representing past cycle durations.
    """
    if len(history) < 2:
        return # Not enough data to train
    
    model.train()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    # Prepare data: X = [c1, c2, ... cn-1], y = [cn]
    # For a simple online update, we treat the last known cycle as the target
    inputs = torch.tensor(history[:-1], dtype=torch.float32).view(1, -1, 1)
    target = torch.tensor([history[-1]], dtype=torch.float32).view(1, 1)
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        # Ensure input sequence matches expected input_size if necessary
        # Here we just pass the variable length sequence (PyTorch LSTM handles it)
        output = model(inputs)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
    
    print(f"[CyclePredictor] Model updated with user history. Final loss: {loss.item():.4f}")

def predict_next_cycle(model, seq):
    model.eval()
    with torch.no_grad():
        seq = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        prediction = model(seq)
        return prediction.item()
