import pandas as pd
import numpy as np
import pickle
import json
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_percentage_error
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestRegressor

# Load data
print("Loading data...")
df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

# Feature Engineering matching compare_all_algorithms.py
df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff()
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std()
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
)
df = df.dropna()

# Split matching project standard
train_cutoff = pd.Timestamp('2025-04-30')
train_data = df[df['date'] <= train_cutoff]
test_data = df[df['date'] > train_cutoff]

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, GRU, Dense, Dropout
from sklearn.preprocessing import StandardScaler

feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3m', 'rolling_6m',
                'rolling_3m_std', 'sales_velocity', 'sales_trend',
                'month', 'quarter', 'is_festival', 'category_encoded']

X_train = train_data[feature_cols].values
y_train = train_data['quantity_sold'].values
X_test = test_data[feature_cols].values
y_test = test_data['quantity_sold'].values

# Scale for DL
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Reshape (samples, timesteps, features)
X_train_reshaped = X_train_scaled.reshape(X_train_scaled.shape[0], 1, X_train_scaled.shape[1])
X_test_reshaped = X_test_scaled.reshape(X_test_scaled.shape[0], 1, X_test_scaled.shape[1])

def evaluate_dl_model(m_type):
    print(f"Evaluating {m_type}...")
    if m_type == 'LSTM':
        layer = LSTM(50, activation='relu', input_shape=(1, X_train_reshaped.shape[2]))
    else:
        layer = GRU(50, activation='relu', input_shape=(1, X_train_reshaped.shape[2]))
        
    model = Sequential([
        layer,
        Dropout(0.2),
        Dense(25, activation='relu'),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X_train_reshaped, y_train, epochs=20, batch_size=64, verbose=0)
    y_pred = model.predict(X_test_reshaped, verbose=0).flatten()
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mape = mean_absolute_percentage_error(y_test, y_pred) * 100
    r2 = r2_score(y_test, y_pred)
    
    return {
        'Accuracy': 100 - mape,
        'MSE': mse,
        'RMSE': rmse,
        'R2': r2
    }

final_metrics = {}

# Re-run tree models for consistency
for name in ['LightGBM', 'XGBoost', 'Random Forest']:
    print(f"Evaluating {name}...")
    if name == 'LightGBM':
        m = LGBMRegressor(n_estimators=200, learning_rate=0.03, max_depth=10, num_leaves=50, random_state=42, verbose=-1)
    elif name == 'XGBoost':
        m = XGBRegressor(n_estimators=200, learning_rate=0.03, max_depth=10, random_state=42, verbosity=0)
    else:
        m = RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_split=5, random_state=42, n_jobs=-1)
    
    m.fit(X_train, y_train)
    y_pred = m.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    final_metrics[name] = {
        'Accuracy': (1 - mean_absolute_percentage_error(y_test, y_pred)) * 100,
        'MSE': mse,
        'RMSE': np.sqrt(mse),
        'R2': r2_score(y_test, y_pred)
    }

final_metrics['LSTM'] = evaluate_dl_model('LSTM')
final_metrics['GRU'] = evaluate_dl_model('GRU')

print(json.dumps(final_metrics, indent=2))
with open('calculated_metrics.json', 'w') as f:
    json.dump(final_metrics, f, indent=2)


