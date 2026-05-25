"""
compare_by_category.py
Check if accuracy varies by category
"""

import pandas as pd
import pickle

# Load model and data
with open('lightgbm_final_model.pkl', 'rb') as f:
    model = pickle.load(f)

df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

# Add features
# df['lag_4'] = df.groupby('product_name')['quantity_sold'].shift(4)
df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff()
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std()
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
)
df = df.dropna()

# Test set
test = df[df['date'] > pd.Timestamp('2025-04-30')]

feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3m', 'rolling_6m',
                'rolling_3m_std', 'sales_velocity', 'sales_trend',
                'month', 'quarter', 'is_festival', 'category_encoded']

X_test = test[feature_cols]
y_test = test['quantity_sold']

# Make predictions
predictions = model.predict(X_test)

# Add to dataframe
test = test.copy()
test['predicted'] = predictions
test['error'] = abs(test['quantity_sold'] - test['predicted'])
test['error_pct'] = (test['error'] / test['quantity_sold'] * 100).clip(upper=100)

# Accuracy by category
print("="*70)
print("ACCURACY BY CATEGORY")
print("="*70)

category_stats = test.groupby('category').agg({
    'error_pct': 'mean',
    'quantity_sold': 'count'
}).round(2)

category_stats.columns = ['Avg Error %', 'Test Samples']
category_stats['Accuracy %'] = (100 - category_stats['Avg Error %']).round(2)
category_stats = category_stats.sort_values('Accuracy %', ascending=False)

print(category_stats)

print("\n" + "="*70)
print("INTERPRETATION:")
print("="*70)
print("\nIf accuracy varies significantly by category (>5% difference),")
print("then category DOES matter for predictions.")
print("\nIf accuracy is similar across categories,")
print("then product history matters more than category.")