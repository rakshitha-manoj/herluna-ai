import torch
import torch.nn as nn

class SymptomAutoencoder(nn.Module):
    def __init__(self, input_dim=20, hidden_dim=8):
        super(SymptomAutoencoder, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, hidden_dim),
            nn.ReLU()
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

def detect_anomaly(model, data, threshold=0.1):
    model.eval()
    with torch.no_grad():
        reconstruction = model(data)
        loss = nn.MSELoss()(reconstruction, data)
        return loss.item() > threshold, loss.item()
