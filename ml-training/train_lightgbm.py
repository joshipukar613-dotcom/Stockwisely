"""
train_final.py
Final optimized model with balanced features and data retention
"""

import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import pickle
import time

print("Loading features...")
df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

print(f"Initial records: {len(df):,}")

# Add moderate features (not too many lags)
print("Creating features...")

# Sales velocity
df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff()

# Only 1 additional lag
# df['lag_4'] = df.groupby('product_name')['quantity_sold'].shift(4)

# Rolling std
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std()
)

# Sales trend
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
)

# Remove nulls
df = df.dropna()

print(f"After features: {len(df):,} records ({len(df)/26423*100:.1f}% retained)")

# Time-based split
#data start --> end 
#start ra end ko mid point 
train_cutoff = pd.Timestamp('2025-04-30')
train_data = df[df['date'] <= train_cutoff]
test_data = df[df['date'] > train_cutoff]

print(f"Training: {len(train_data):,} records, {train_data['date'].nunique()} months")
print(f"Test: {len(test_data):,} records, {test_data['date'].nunique()} months")

# Optimized features
feature_cols = [
    'lag_1', 'lag_2', 'lag_3',
    'rolling_3m', 'rolling_6m', 'rolling_3m_std',
    'sales_velocity', 'sales_trend',
    'month', 'quarter', 'is_festival', 'category_encoded'
]

#line 56 lag_4 removed

X_train = train_data[feature_cols]
y_train = train_data['quantity_sold']
X_test = test_data[feature_cols]
y_test = test_data['quantity_sold']

print(f"\nFeatures ({len(feature_cols)}): {feature_cols}")

# Train final model
print("\nTraining final LightGBM model...")
start_time = time.time()

model = LGBMRegressor(
    n_estimators=200,
    learning_rate=0.03,
    max_depth=10,
    num_leaves=50,
    min_child_samples=20,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbose=-1
)

model.fit(X_train, y_train)

training_time = time.time() - start_time
print(f"Training completed in {training_time:.2f} seconds ({training_time/60:.2f} minutes)")

# Predictions
train_pred = model.predict(X_train)
test_pred = model.predict(X_test)

# Evaluate
def evaluate(y_true, y_pred, dataset_name):
    mape = mean_absolute_percentage_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    accuracy = (1 - mape) * 100
    
    print(f"\n{dataset_name}:")
    print(f"  MAPE: {mape*100:.2f}%")
    print(f"  Accuracy: {accuracy:.2f}%")
    print(f"  RMSE: {rmse:.2f}")
    print(f"  R-squared: {r2:.4f}")
    
    return {'mape': mape*100, 'accuracy': accuracy, 'rmse': rmse, 'r2': r2}

train_results = evaluate(y_train, train_pred, "Training Set")
test_results = evaluate(y_test, test_pred, "Test Set")

# Feature importance
print("\nFeature Importance:")
importance_df = pd.DataFrame({
    'feature': feature_cols,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)
print(importance_df)

# Save model
with open('lightgbm_final_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("\nModel saved: lightgbm_final_model.pkl")

# Save results
results = {
    'model': 'LightGBM_Final',
    'data_records': len(df),
    'training_records': len(train_data),
    'test_records': len(test_data),
    'training_time_seconds': training_time,
    'features_count': len(feature_cols),
    'train_accuracy': train_results['accuracy'],
    'test_accuracy': test_results['accuracy'],
    'test_mape': test_results['mape'],
    'test_rmse': test_results['rmse'],
    'test_r2': train_results['r2']
}

import json
with open('final_results.json', 'w') as f:
    json.dump(results, f, indent=2)
print("Results saved: final_results.json")

# Visualizations
print("\nCreating final visualizations...")

# 1. Feature Importance
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

ax1 = axes[0, 0]
importance_df_plot = importance_df.head(10)
ax1.barh(importance_df_plot['feature'], importance_df_plot['importance'], color='steelblue')
ax1.set_xlabel('Importance Score')
ax1.set_title('Top 10 Feature Importance', fontweight='bold')
ax1.invert_yaxis()

# 2. Actual vs Predicted
ax2 = axes[0, 1]
ax2.scatter(y_test, test_pred, alpha=0.5, s=20)
ax2.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
ax2.set_xlabel('Actual Quantity')
ax2.set_ylabel('Predicted Quantity')
ax2.set_title(f'Actual vs Predicted\nAccuracy: {test_results["accuracy"]:.2f}%', fontweight='bold')
ax2.grid(True, alpha=0.3)

# 3. Performance Comparison
ax3 = axes[1, 0]
datasets = ['Training', 'Test']
accuracies = [train_results['accuracy'], test_results['accuracy']]
bars = ax3.bar(datasets, accuracies, color=['#2ecc71', '#e74c3c'])
ax3.set_ylabel('Accuracy (%)')
ax3.set_title('Model Performance', fontweight='bold')
ax3.set_ylim(0, 100)
ax3.axhline(y=70, color='orange', linestyle='--', linewidth=2, label='Target (70%)')
ax3.legend()
for bar in bars:
    height = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2., height,
             f'{height:.1f}%', ha='center', va='bottom', fontweight='bold', fontsize=11)

# 4. Residuals
ax4 = axes[1, 1]
residuals = y_test - test_pred
ax4.scatter(test_pred, residuals, alpha=0.5, s=20)
ax4.axhline(y=0, color='r', linestyle='--', lw=2)
ax4.set_xlabel('Predicted Quantity')
ax4.set_ylabel('Residuals')
ax4.set_title('Residual Plot', fontweight='bold')
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('final_model_analysis.png', dpi=300, bbox_inches='tight')
print("Saved: final_model_analysis.png")

print("\n" + "="*60)
print("FINAL MODEL SUMMARY")
print("="*60)
print(f"Algorithm: LightGBM Gradient Boosting")
print(f"Training Data: {len(train_data):,} records across {train_data['date'].nunique()} months")
print(f"Test Data: {len(test_data):,} records across {test_data['date'].nunique()} months")
print(f"Features Used: {len(feature_cols)}")
print(f"Training Time: {training_time:.2f} seconds")
print(f"\nPerformance Metrics:")
print(f"  Test Accuracy: {test_results['accuracy']:.2f}%")
print(f"  Test MAPE: {test_results['mape']:.2f}%")
print(f"  Test RMSE: {test_results['rmse']:.2f}")
print(f"  R-squared: {test_results['r2']:.4f}")
print(f"\nStatus: {'PASSED' if test_results['accuracy'] >= 70 else 'BELOW TARGET'} (Target: 70%)")
print("="*60)