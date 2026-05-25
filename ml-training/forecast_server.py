"""
forecast_server.py
Flask Microservice for Stock Wisely — Hybrid v7 Demand Forecasting
===================================================================
Author: Pukar Joshi (2329786)
Updated: April 2026

MODEL: Two-Stage Hybrid v7
  Stage 1: Rule gate  — rolling_3m >= SELL_THRESHOLD -> sell=1 else pred=0
  Stage 2: Residual regressor — LSTM + RF stacked
    Target  : residual_log = log1p(qty) - log1p(rolling_3m)
    Predict : expm1(clip(blend_residual + log1p(rolling_3m), -10, 10))
    Blend   : W_LSTM * lstm_pred + W_RF * rf_pred (loaded from metadata)

WHAT CHANGED FROM OLD SERVER:
  - Loads lstm_regressor.keras + rf_regressor.joblib (was single lstm_forecast_model)
  - Uses hybrid_model_metadata.json (was lstm_model_metadata.json)
  - Uses RobustScaler (was StandardScaler)
  - TIMESTEPS = 6 (was 1 or 3)
  - Features = 7: sales_velocity, lag_2, sales_trend, lag_3, lag_1,
                  rolling_3m, rolling_3m_std  (was 12)
  - Residual reconstruction: expm1(residual + log1p(rolling_3m))
  - Sell gate applied to all predictions
  - Removed: accuracy metric (replaced with RMSE, MAE, SMAPE, R2, F1)
  - Metrics reported: rmse, mae, smape, r2, f1 (teacher-approved)

ENDPOINTS:
  GET /api/forecast/health          — model status + metrics
  GET /api/forecast/summary         — dashboard KPI cards
  GET /api/forecast/categories      — per-category forecasts
  GET /api/forecast/products        — per-product forecasts (filterable)
  GET /api/forecast/trends          — monthly trend + forecast point
  GET /api/forecast/product/<name>  — single product detail + history
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from tensorflow.keras.models import load_model
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# ── Load artifacts ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("=" * 55)
print("Loading Hybrid v7 model artifacts...")

lstm_model = load_model(os.path.join(BASE_DIR, 'lstm_regressor.keras'))
rf_model   = joblib.load(os.path.join(BASE_DIR, 'rf_regressor.joblib'))
scaler     = joblib.load(os.path.join(BASE_DIR, 'hybrid_scaler_reg.joblib'))

with open(os.path.join(BASE_DIR, 'hybrid_model_metadata.json'), 'r') as f:
    metadata = json.load(f)

# ── Model config from metadata ──────────────────────────────
FEATURE_COLS    = metadata['feature_cols']
TIMESTEPS       = metadata['timesteps']             # 6
SELL_THRESHOLD  = metadata['stage1']['threshold']   # auto-tuned
W_LSTM          = metadata['stage2']['w_lstm']
W_RF            = metadata['stage2']['w_rf']
ROLLING_3M_IDX  = FEATURE_COLS.index('rolling_3m') # index 5

print(f"  Feature cols    : {FEATURE_COLS}")
print(f"  n_features      : {len(FEATURE_COLS)}")
print(f"  Timesteps       : {TIMESTEPS}")
print(f"  Sell threshold  : rolling_3m >= {SELL_THRESHOLD}")
print(f"  Blend weights   : LSTM={W_LSTM}, RF={W_RF}")

# ── Load feature data ───────────────────────────────────────
print("\nLoading sales data...")
df = pd.read_csv(os.path.join(BASE_DIR, 'data_features.csv'))
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values(['product_name', 'date'])

# Recompute derived features for consistency with training
for col in ['sales_velocity', 'rolling_3m_std', 'sales_trend']:
    if col in df.columns:
        df.drop(columns=[col], inplace=True)

df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff().fillna(0)
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std().fillna(0)
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
).fillna(0)
df = df.dropna()

print(f"  Records  : {len(df):,}")
print(f"  Products : {df['product_name'].nunique():,}")
print(f"  Date range: {df['date'].min().date()} to {df['date'].max().date()}")

# ── Target month ────────────────────────────────────────────
latest_date    = df['date'].max()
TARGET_DATE    = latest_date + pd.DateOffset(months=1)
TARGET_MONTH   = TARGET_DATE.month
TARGET_QUARTER = (TARGET_MONTH - 1) // 3 + 1


# ── Feature vector builder ──────────────────────────────────
def build_sequence_for_product(pdata):
    """
    Build a (TIMESTEPS, n_features) sequence from the last TIMESTEPS rows
    of a product's history. Returns None if not enough history.

    Feature order matches FEATURE_COLS exactly:
      [sales_velocity, lag_2, sales_trend, lag_3, lag_1, rolling_3m, rolling_3m_std]

    Also returns rolling_3m_last (unscaled) for:
      - sell gate check
      - residual reconstruction
    """
    pdata = pdata.sort_values('date').reset_index(drop=True)
    if len(pdata) < TIMESTEPS:
        return None, None

    last_rows = pdata.tail(TIMESTEPS).reset_index(drop=True)

    seq = []
    for i, row in last_rows.iterrows():
        vec = [row[f] for f in FEATURE_COLS]
        seq.append(vec)

    rolling_3m_last = float(last_rows.iloc[-1]['rolling_3m'])
    return np.array(seq, dtype=np.float32), rolling_3m_last


# ── Prediction pipeline ─────────────────────────────────────
def predict_batch(sequences, rolling_3m_values):
    """
    Run full v7 pipeline on a batch of sequences.

    sequences      : np.array shape (N, TIMESTEPS, n_features) — unscaled
    rolling_3m_values: np.array shape (N,) — unscaled rolling_3m last values

    Returns: np.array shape (N,) — predicted quantities in real units
    """
    N = len(sequences)
    n_feat = sequences.shape[2]

    # Scale: flatten -> scale -> reshape
    flat    = sequences.reshape(-1, n_feat)
    scaled  = scaler.transform(flat)
    scaled  = scaled.reshape(N, TIMESTEPS, n_feat)

    # LSTM residual predictions
    lstm_res = lstm_model.predict(scaled, verbose=0).flatten()

    # RF residual predictions (last timestep only)
    rf_res = rf_model.predict(scaled[:, -1, :])

    # Blend residuals
    blend_res = W_LSTM * lstm_res + W_RF * rf_res

    # Reconstruct: expm1(clip(residual + log1p(rolling_3m), -10, 10))
    rolling_3m_log = np.log1p(np.array(rolling_3m_values, dtype=np.float64))
    pred_log       = np.clip(blend_res + rolling_3m_log, -10, 10)
    pred_qty       = np.maximum(np.expm1(pred_log), 0)

    # Apply sell gate
    sell_gate = (np.array(rolling_3m_values) >= SELL_THRESHOLD).astype(float)
    pred_qty  = sell_gate * pred_qty

    return pred_qty


# ── Pre-calculate all forecasts ─────────────────────────────
FORECAST_CACHE = {}   # product_name -> predicted quantity (float)

def precalculate_all_forecasts():
    print(f"\nPre-calculating forecasts for {TARGET_DATE.strftime('%B %Y')}...")
    print(f"  TIMESTEPS={TIMESTEPS}, features={len(FEATURE_COLS)}, "
          f"sell_gate=rolling_3m>={SELL_THRESHOLD}")

    grouped = dict(tuple(df.groupby('product_name')))
    sequences_list    = []
    rolling_3m_list   = []
    valid_products    = []

    for pname, pdata in grouped.items():
        seq, rolling_3m_last = build_sequence_for_product(pdata)
        if seq is None:
            continue
        sequences_list.append(seq)
        rolling_3m_list.append(rolling_3m_last)
        valid_products.append(pname)

    if not sequences_list:
        print("  [WARNING] No valid products for forecasting.")
        return

    batch_seqs   = np.array(sequences_list, dtype=np.float32)
    rolling_3m_arr = np.array(rolling_3m_list, dtype=np.float64)

    predictions = predict_batch(batch_seqs, rolling_3m_arr)

    for pname, pred in zip(valid_products, predictions):
        FORECAST_CACHE[pname] = round(float(pred), 1)

    zeroed  = sum(1 for v in FORECAST_CACHE.values() if v == 0)
    nonzero = len(FORECAST_CACHE) - zeroed
    print(f"  Cached {len(FORECAST_CACHE):,} products "
          f"({nonzero:,} non-zero, {zeroed:,} sell-gated to 0)")


precalculate_all_forecasts()


# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/forecast/health', methods=['GET'])
def health():
    """Model status and metrics."""
    m = metadata['metrics']
    return jsonify({
        'status'          : 'ok',
        'model'           : metadata.get('model_version', 'hybrid_v7'),
        'products'        : int(df['product_name'].nunique()),
        'categories'      : int(df['category'].nunique()),
        'cached_forecasts': len(FORECAST_CACHE),
        'forecast_month'  : TARGET_DATE.strftime('%B %Y'),
        'stage1': {
            'type'          : f'Rule gate (rolling_3m >= {SELL_THRESHOLD})',
            'f1'            : metadata['stage1']['f1'],
            'precision'     : metadata['stage1']['precision'],
            'recall'        : metadata['stage1']['recall'],
        },
        'stage2': {
            'type'    : 'LSTM + RF residual regressor',
            'w_lstm'  : W_LSTM,
            'w_rf'    : W_RF,
        },
        'metrics': {
            'rmse'  : m.get('rmse'),
            'mae'   : m.get('mae'),
            'smape' : m.get('smape'),
            'r2'    : m.get('r2'),
            'f1'    : m.get('f1'),
            'note'  : m.get('note', 'All in real units. No accuracy term.')
        }
    })


@app.route('/api/forecast/summary', methods=['GET'])
def forecast_summary():
    """Dashboard KPI cards."""
    latest_date    = df['date'].max()
    last_month_qty = float(df[df['date'] == latest_date]['quantity_sold'].sum())
    predicted_total = sum(FORECAST_CACHE.values())

    demand_change = round(
        ((predicted_total - last_month_qty) / max(last_month_qty, 1)) * 100, 1
    )

    m = metadata['metrics']
    return jsonify({
        'success': True,
        'data': {
            'totalProducts'       : int(df['product_name'].nunique()),
            'totalCategories'     : int(df['category'].nunique()),
            'forecastMonth'       : TARGET_DATE.strftime('%B %Y'),
            'totalPredictedDemand': round(predicted_total),
            'lastMonthActual'     : round(last_month_qty),
            'demandChange'        : demand_change,
            'metrics': {
                'rmse'  : m.get('rmse'),
                'mae'   : m.get('mae'),
                'smape' : m.get('smape'),
                'r2'    : m.get('r2'),
                'f1'    : m.get('f1'),
            }
        }
    })


@app.route('/api/forecast/categories', methods=['GET'])
def forecast_categories():
    """Category-level forecast aggregates."""
    latest_date = df['date'].max()
    results = []

    for cat in sorted(df['category'].unique()):
        cat_df     = df[df['category'] == cat]
        last_qty   = float(cat_df[cat_df['date'] == latest_date]['quantity_sold'].sum())
        cat_prods  = cat_df['product_name'].unique()
        predicted  = sum(FORECAST_CACHE.get(p, 0) for p in cat_prods)
        change_pct = round(((predicted - last_qty) / max(last_qty, 1)) * 100, 1)

        results.append({
            'category'      : cat,
            'lastMonthActual': round(last_qty),
            'predictedDemand': round(predicted),
            'changePct'     : change_pct,
            'trend'         : 'up' if change_pct > 0 else 'down',
            'productCount'  : int(len(cat_prods)),
        })

    results.sort(key=lambda x: x['predictedDemand'], reverse=True)

    return jsonify({
        'success'      : True,
        'data'         : results,
        'forecastMonth': TARGET_DATE.strftime('%B %Y'),
    })


@app.route('/api/forecast/products', methods=['GET'])
def forecast_products():
    """Top product forecasts with optional category filter."""
    category_filter = request.args.get('category', 'all')
    limit           = int(request.args.get('limit', 20))

    filtered = df if category_filter == 'all' else df[df['category'] == category_filter]
    latest_date = filtered['date'].max()

    # Rank by recent 3-month sales to surface relevant products
    recent = filtered[filtered['date'] >= latest_date - pd.DateOffset(months=3)]
    top_products = (
        recent.groupby('product_name')['quantity_sold']
              .sum()
              .sort_values(ascending=False)
              .head(limit * 3)
              .index
    )

    results = []
    for pname in top_products:
        if pname not in FORECAST_CACHE:
            continue
        pdata    = filtered[filtered['product_name'] == pname].sort_values('date')
        latest   = pdata.iloc[-1]
        last_qty = float(latest['quantity_sold'])
        pred     = FORECAST_CACHE[pname]
        change   = round(((pred - last_qty) / max(last_qty, 1)) * 100, 1)

        results.append({
            'productName'    : pname,
            'category'       : str(latest['category']),
            'lastMonthActual': round(last_qty),
            'predictedDemand': round(pred),
            'changePct'      : change,
            'trend'          : 'up' if change > 0 else 'down',
            'avgMonthly'     : round(float(pdata['quantity_sold'].mean()), 1),
            'sellGated'      : pred == 0,
        })

    results.sort(key=lambda x: x['predictedDemand'], reverse=True)
    results = results[:limit]

    return jsonify({
        'success'      : True,
        'data'         : results,
        'forecastMonth': TARGET_DATE.strftime('%B %Y'),
        'category'     : category_filter,
        'total'        : len(results),
    })


@app.route('/api/forecast/trends', methods=['GET'])
def forecast_trends():
    """9 months of history + 1 forecast point for chart rendering."""
    category_filter = request.args.get('category', 'all')

    filtered = df if category_filter == 'all' else df[df['category'] == category_filter]

    monthly = (
        filtered.groupby('date')['quantity_sold']
                .sum()
                .reset_index()
                .sort_values('date')
                .tail(9)
    )

    historical = [
        {
            'date'  : row['date'].strftime('%Y-%m'),
            'label' : row['date'].strftime('%b %Y'),
            'actual': round(float(row['quantity_sold'])),
        }
        for _, row in monthly.iterrows()
    ]

    cat_prods       = filtered['product_name'].unique()
    predicted_total = sum(FORECAST_CACHE.get(p, 0) for p in cat_prods)

    return jsonify({
        'success': True,
        'data': {
            'historical': historical,
            'forecast': {
                'date'     : TARGET_DATE.strftime('%Y-%m'),
                'label'    : TARGET_DATE.strftime('%b %Y'),
                'predicted': round(predicted_total),
            }
        },
        'category': category_filter,
    })


@app.route('/api/forecast/product/<path:product_name>', methods=['GET'])
def forecast_single_product(product_name):
    """
    Single product detail: full history + forecast + model diagnostics.
    Useful for product detail pages.
    """
    pdata = df[df['product_name'] == product_name].sort_values('date')
    if len(pdata) == 0:
        return jsonify({'success': False, 'error': f'Product not found: {product_name}'}), 404

    # History
    history = [
        {
            'date'  : row['date'].strftime('%Y-%m'),
            'label' : row['date'].strftime('%b %Y'),
            'actual': round(float(row['quantity_sold'])),
        }
        for _, row in pdata.iterrows()
    ]

    pred            = FORECAST_CACHE.get(product_name, 0)
    latest          = pdata.iloc[-1]
    rolling_3m_last = float(latest['rolling_3m'])
    sell_gated      = rolling_3m_last < SELL_THRESHOLD

    return jsonify({
        'success'        : True,
        'productName'    : product_name,
        'category'       : str(latest['category']),
        'forecastMonth'  : TARGET_DATE.strftime('%B %Y'),
        'predictedDemand': round(pred),
        'lastMonthActual': round(float(latest['quantity_sold'])),
        'avgMonthly'     : round(float(pdata['quantity_sold'].mean()), 1),
        'sellGated'      : sell_gated,
        'rolling3m'      : round(rolling_3m_last, 3),
        'sellThreshold'  : SELL_THRESHOLD,
        'history'        : history,
    })


# ── Startup ─────────────────────────────────────────────────
if __name__ == '__main__':
    m = metadata['metrics']
    print("\n" + "=" * 55)
    print("  Stock Wisely — Hybrid v7 Forecast Server")
    print("=" * 55)
    print(f"  Model     : {metadata.get('model_version', 'hybrid_v7')}")
    print(f"  Features  : {len(FEATURE_COLS)} — {FEATURE_COLS}")
    print(f"  Timesteps : {TIMESTEPS}")
    print(f"  Sell gate : rolling_3m >= {SELL_THRESHOLD}")
    print(f"  Blend     : LSTM={W_LSTM}, RF={W_RF}")
    print(f"  Cached    : {len(FORECAST_CACHE):,} products")
    print(f"  Forecast  : {TARGET_DATE.strftime('%B %Y')}")
    print(f"  Metrics   : RMSE={m.get('rmse')}  MAE={m.get('mae')}  "
          f"SMAPE={m.get('smape')}%  R2={m.get('r2')}  F1={m.get('f1')}")
    print("=" * 55)
    app.run(host='0.0.0.0', port=5002, debug=False)