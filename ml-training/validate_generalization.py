"""
validate_generalization.py
Cross-validation to prove LightGBM generalizes better
"""

import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_percentage_error
import matplotlib.pyplot as plt

print("Loading data...")
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
df = df.sort_values('date')

feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3m', 'rolling_6m',
                'rolling_3m_std', 'sales_velocity', 'sales_trend',
                'month', 'quarter', 'is_festival', 'category_encoded']

X = df[feature_cols].values
y = df['quantity_sold'].values

print(f"Total records: {len(df):,}")

# Time series cross-validation (3 splits)
print("\nPerforming Time Series Cross-Validation...")
tscv = TimeSeriesSplit(n_splits=3)

results = {
    'LightGBM': [],
    'XGBoost': [],
    'Random Forest': []
}

for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
    print(f"\nFold {fold}:")
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    
    # LightGBM
    lgbm = LGBMRegressor(n_estimators=200, learning_rate=0.03, max_depth=10,
                         num_leaves=50, random_state=42, verbose=-1)
    lgbm.fit(X_train, y_train)
    lgbm_pred = lgbm.predict(X_test)
    lgbm_acc = (1 - mean_absolute_percentage_error(y_test, lgbm_pred)) * 100
    results['LightGBM'].append(lgbm_acc)
    print(f"  LightGBM: {lgbm_acc:.2f}%")
    
    # XGBoost
    xgb = XGBRegressor(n_estimators=200, learning_rate=0.03, max_depth=10,
                       random_state=42, verbosity=0)
    xgb.fit(X_train, y_train)
    xgb_pred = xgb.predict(X_test)
    xgb_acc = (1 - mean_absolute_percentage_error(y_test, xgb_pred)) * 100
    results['XGBoost'].append(xgb_acc)
    print(f"  XGBoost: {xgb_acc:.2f}%")
    
    # Random Forest
    rf = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_acc = (1 - mean_absolute_percentage_error(y_test, rf_pred)) * 100
    results['Random Forest'].append(rf_acc)
    print(f"  Random Forest: {rf_acc:.2f}%")

# Calculate statistics
print("\n" + "="*70)
print("CROSS-VALIDATION RESULTS (Consistency Check)")
print("="*70)

summary = []
for algo in results:
    scores = results[algo]
    mean_acc = np.mean(scores)
    std_acc = np.std(scores)
    min_acc = np.min(scores)
    max_acc = np.max(scores)
    
    print(f"\n{algo}:")
    print(f"  Mean Accuracy: {mean_acc:.2f}%")
    print(f"  Std Deviation: {std_acc:.2f}% (lower is better - more consistent)")
    print(f"  Min Accuracy: {min_acc:.2f}%")
    print(f"  Max Accuracy: {max_acc:.2f}%")
    print(f"  Range: {max_acc - min_acc:.2f}% (lower is better - more stable)")
    
    summary.append({
        'Algorithm': algo,
        'Mean': mean_acc,
        'Std': std_acc,
        'Min': min_acc,
        'Max': max_acc,
        'Range': max_acc - min_acc
    })

print("="*70)

# Visualization
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Box plot
ax1 = axes[0]
data_to_plot = [results[algo] for algo in results]
bp = ax1.boxplot(data_to_plot, labels=list(results.keys()), patch_artist=True)
colors = ['#2ecc71', '#3498db', '#e74c3c']
for patch, color in zip(bp['boxes'], colors):
    patch.set_facecolor(color)
ax1.set_ylabel('Accuracy (%)', fontsize=12)
ax1.set_title('Cross-Validation Accuracy Distribution\n(Lower variance = Better generalization)', 
              fontsize=12, fontweight='bold')
ax1.grid(True, alpha=0.3)
ax1.axhline(y=70, color='orange', linestyle='--', linewidth=2, label='Target (70%)')
ax1.legend()

# Consistency comparison
ax2 = axes[1]
algos = [s['Algorithm'] for s in summary]
stds = [s['Std'] for s in summary]
bars = ax2.bar(algos, stds, color=colors)
ax2.set_ylabel('Standard Deviation (%)', fontsize=12)
ax2.set_title('Model Consistency\n(Lower = More Stable/Reliable)', 
              fontsize=12, fontweight='bold')
for bar in bars:
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.2f}%', ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
plt.savefig('generalization_analysis.png', dpi=300, bbox_inches='tight')
print("\nSaved: generalization_analysis.png")

# Final recommendation
print("\n" + "="*70)
print("RECOMMENDATION")
print("="*70)
best_consistency = min(summary, key=lambda x: x['Std'])
print(f"\nMost Consistent Algorithm: {best_consistency['Algorithm']}")
print(f"  - Lowest variance across folds")
print(f"  - Better generalization to unseen data")
print(f"  - More reliable for production deployment")
print("\nConclusion:")
print(f"  Choose {best_consistency['Algorithm']} for production deployment")
print(f"  Despite potentially lower single-test accuracy, it generalizes better")
print("="*70)

# Save summary
import json
with open('generalization_results.json', 'w') as f:
    json.dump(summary, f, indent=2)
print("\nSaved: generalization_results.json")