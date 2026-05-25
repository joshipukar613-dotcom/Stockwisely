"""
compare_all_algorithms.py
Compare LightGBM vs XGBoost vs Random Forest
"""

import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import time
import json

print("Loading prepared features...")
df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

# Add features
df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff()
# df['lag_4'] = df.groupby('product_name')['quantity_sold'].shift(4)
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std()
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
)
df = df.dropna()

# Split
train_cutoff = pd.Timestamp('2025-04-30')
train_data = df[df['date'] <= train_cutoff]
test_data = df[df['date'] > train_cutoff]

feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3m', 'rolling_6m',
                'rolling_3m_std', 'sales_velocity', 'sales_trend',
                'month', 'quarter', 'is_festival', 'category_encoded']

X_train = train_data[feature_cols]
y_train = train_data['quantity_sold']
X_test = test_data[feature_cols]
y_test = test_data['quantity_sold']

print(f"Training: {len(X_train):,} records")
print(f"Test: {len(X_test):,} records")

results = {}

# 1. LightGBM
print("\n1. Training LightGBM...")
start = time.time()
lgbm = LGBMRegressor(n_estimators=200, learning_rate=0.03, max_depth=10,
                     num_leaves=50, random_state=42, verbose=-1)
lgbm.fit(X_train, y_train)
lgbm_time = time.time() - start
lgbm_pred = lgbm.predict(X_test)
lgbm_mape = mean_absolute_percentage_error(y_test, lgbm_pred) * 100
lgbm_rmse = np.sqrt(mean_squared_error(y_test, lgbm_pred))
results['LightGBM'] = {
    'accuracy': 100 - lgbm_mape,
    'mape': lgbm_mape,
    'rmse': lgbm_rmse,
    'time': lgbm_time
}
print(f"   Accuracy: {100-lgbm_mape:.2f}%, Time: {lgbm_time:.2f}s")

# 2. XGBoost
print("\n2. Training XGBoost...")
start = time.time()
xgb = XGBRegressor(n_estimators=200, learning_rate=0.03, max_depth=10,
                   random_state=42, verbosity=0)
xgb.fit(X_train, y_train)
xgb_time = time.time() - start
xgb_pred = xgb.predict(X_test)
xgb_mape = mean_absolute_percentage_error(y_test, xgb_pred) * 100
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
results['XGBoost'] = {
    'accuracy': 100 - xgb_mape,
    'mape': xgb_mape,
    'rmse': xgb_rmse,
    'time': xgb_time
}
print(f"   Accuracy: {100-xgb_mape:.2f}%, Time: {xgb_time:.2f}s")

# 3. Random Forest
print("\n3. Training Random Forest...")
start = time.time()
rf = RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_split=5,
                           random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
rf_time = time.time() - start
rf_pred = rf.predict(X_test)
rf_mape = mean_absolute_percentage_error(y_test, rf_pred) * 100
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
results['Random Forest'] = {
    'accuracy': 100 - rf_mape,
    'mape': rf_mape,
    'rmse': rf_rmse,
    'time': rf_time
}
print(f"   Accuracy: {100-rf_mape:.2f}%, Time: {rf_time:.2f}s")

# Save comparison
with open('algorithm_comparison.json', 'w') as f:
    json.dump(results, f, indent=2)
print("\nSaved: algorithm_comparison.json")

# Create comparison table
comparison_df = pd.DataFrame(results).T
comparison_df = comparison_df.round(2)
print("\nAlgorithm Comparison:")
print(comparison_df)

# Visualization
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

algorithms = list(results.keys())
accuracies = [results[alg]['accuracy'] for alg in algorithms]
times = [results[alg]['time'] for alg in algorithms]

# Accuracy comparison
bars1 = ax1.bar(algorithms, accuracies, color=['#2ecc71', '#3498db', '#e74c3c'])
ax1.set_ylabel('Accuracy (%)', fontsize=12)
ax1.set_title('Algorithm Accuracy Comparison', fontsize=14, fontweight='bold')
ax1.axhline(y=70, color='orange', linestyle='--', linewidth=2, label='Target (70%)')
ax1.set_ylim(0, 100)
ax1.legend()
for i, bar in enumerate(bars1):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.1f}%', ha='center', va='bottom', fontweight='bold', fontsize=11)

# Training time comparison
bars2 = ax2.bar(algorithms, times, color=['#2ecc71', '#3498db', '#e74c3c'])
ax2.set_ylabel('Training Time (seconds)', fontsize=12)
ax2.set_title('Training Time Comparison', fontsize=14, fontweight='bold')
for i, bar in enumerate(bars2):
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.2f}s', ha='center', va='bottom', fontweight='bold', fontsize=11)

plt.tight_layout()
plt.savefig('algorithm_comparison.png', dpi=300, bbox_inches='tight')
print("Saved: algorithm_comparison.png")

print("\n" + "="*60)
print("COMPARISON SUMMARY")
print("="*60)
print(comparison_df.to_string())
print("="*60)
print(f"\nBest Accuracy: {comparison_df['accuracy'].idxmax()} ({comparison_df['accuracy'].max():.2f}%)")
print(f"Fastest Training: {comparison_df['time'].idxmin()} ({comparison_df['time'].min():.2f}s)")
print("="*60)