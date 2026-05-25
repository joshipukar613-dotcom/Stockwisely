"""
verify_predictions.py
Verify model predictions against actual sales for known products
"""

import pandas as pd
import pickle
import numpy as np
from sklearn.metrics import mean_absolute_percentage_error

print("Loading model...")
with open('lightgbm_final_model.pkl', 'rb') as f:
    model = pickle.load(f)

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

# Get test data (last 2 months)
test_data = df[df['date'] > pd.Timestamp('2025-04-30')]

print(f"\nTest Period: {test_data['date'].min()} to {test_data['date'].max()}")
print(f"Products: {test_data['product_name'].nunique()}")

# Pick top 10 highest volume products
high_volume = test_data.groupby('product_name')['quantity_sold'].sum().nlargest(10)
sample_products = high_volume.index
print(f"\nTesting on TOP 10 highest volume products (min total sales: {high_volume.min():.0f} units)")

print("\n" + "="*80)
print("PREDICTION VERIFICATION - Top 10 Products")
print("="*80)

feature_cols = ['lag_1', 'lag_2', 'lag_3', 'rolling_3m', 'rolling_6m',
                'rolling_3m_std', 'sales_velocity', 'sales_trend',
                'month', 'quarter', 'is_festival', 'category_encoded']

verification_results = []

for product in sample_products:
    product_data = test_data[test_data['product_name'] == product].sort_values('date')
    
    if len(product_data) == 0:
        continue
    
    # Get latest record
    latest = product_data.iloc[-1]
    
    # Make prediction
    X = pd.DataFrame([latest[feature_cols].values], columns=feature_cols)
    prediction = model.predict(X)[0]
    actual = latest['quantity_sold']
    
    # Calculate error
    error = abs(prediction - actual)
    error_pct = (error / actual * 100) if actual > 0 else 0
    
    # Get historical context
    last_month = latest['lag_1']
    
    print(f"\nProduct: {product[:50]}")
    print(f"  Date: {latest['date'].strftime('%Y-%m-%d')}")
    print(f"  Last month sales: {last_month:.1f} units")
    print(f"  Actual sales: {actual:.1f} units")
    print(f"  Predicted sales: {prediction:.1f} units")
    print(f"  Error: {error:.1f} units ({error_pct:.1f}%)")
    print(f"  Status: {'ACCURATE' if error_pct < 20 else 'NEEDS REVIEW'}")
    
    verification_results.append({
        'product': product,
        'date': latest['date'],
        'last_month': last_month,
        'actual': actual,
        'predicted': prediction,
        'error': error,
        'error_pct': error_pct
    })

# Overall statistics
print("\n" + "="*80)
print("OVERALL VERIFICATION STATISTICS")
print("="*80)

results_df = pd.DataFrame(verification_results)
avg_error_pct = results_df['error_pct'].mean()
median_error_pct = results_df['error_pct'].median()
accurate_predictions = (results_df['error_pct'] < 20).sum()
total_predictions = len(results_df)

print(f"\nTotal Products Verified: {total_predictions}")
print(f"Average Error: {avg_error_pct:.2f}%")
print(f"Median Error: {median_error_pct:.2f}%")
print(f"Predictions within 20% error: {accurate_predictions}/{total_predictions} ({accurate_predictions/total_predictions*100:.1f}%)")

# Save verification results
results_df.to_csv('prediction_verification.csv', index=False)
print("\nSaved: prediction_verification.csv")

print("\n" + "="*80)
print("INTERPRETATION")
print("="*80)
print("\nHow to interpret these results:")
print("1. Error < 10%: Excellent prediction")
print("2. Error 10-20%: Good prediction (acceptable for inventory planning)")
print("3. Error 20-30%: Fair prediction (use with caution)")
print("4. Error > 30%: Poor prediction (investigate product behavior)")
print("\nNote: Higher errors often occur with:")
print("  - Low-volume products (1-2 units/month)")
print("  - Seasonal products")
print("  - New products with limited history")
print("="*80)