import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, f1_score, mean_squared_error

def cluster_users(user_metrics_df, n_clusters=3):
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(user_metrics_df)
    return clusters, kmeans.cluster_centers_

def calculate_evaluation_metrics(y_true, y_pred, task_type='regression'):
    if task_type == 'regression':
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        return {"MAE": mae, "RMSE": rmse}
    elif task_type == 'classification':
        f1 = f1_score(y_true, y_pred, average='weighted')
        return {"F1_Score": f1}
    return {}

def perform_ablation_study(model, test_data, feature_mask):
    # Simplified ablation: zero out specific features and check performance drop
    pass
