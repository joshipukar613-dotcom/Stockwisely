"""
feature_selection.py
LSTM Permutation Feature Importance
====================================
Stock Wisely FYP
Author: Pukar Joshi (2329786)

PURPOSE:
  Find which features actually help the LSTM.
  RF importance is WRONG for this -- RF memorised rolling_3m.
  
  Method: Permutation Importance
    1. Get baseline SMAPE from trained LSTM
    2. For each feature, randomly shuffle it (break its signal)
    3. Measure how much SMAPE gets worse
    4. Big increase = feature was important
    5. No increase  = feature was noise (remove it)
  
  This uses YOUR TRAINED LSTM -- no retraining needed.
  Runtime: ~5 minutes

RESULT:
  Features ranked by true LSTM importance.
  Features with importance < 1% SMAPE increase = safe to remove.
"""

import pandas as pd
import numpy as np
import json
import joblib
from tensorflow.keras.models import load_model
import tensorflow as tf
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print("LSTM PERMUTATION FEATURE IMPORTANCE")
print("=" * 60)

# ── Metric ────────────────────────────────────────────────────
def smape(y_true, y_pred):
    y_true = np.array(y_true, dtype=np.float64)
    y_pred = np.array(y_pred, dtype=np.float64)
    denom  = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    mask   = denom > 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(
        np.abs(y_true[mask] - y_pred[mask]) / denom[mask]
    ) * 100)

# ── Load saved model and metadata ────────────────────────────
print("\n[1/4] Loading saved LSTM and metadata...")

huber = tf.keras.losses.Huber(delta=1.0)
lstm_reg   = load_model('lstm_regressor.keras',
                        custom_objects={'huber_loss': huber})
scaler_reg = joblib.load('hybrid_scaler_reg.joblib')

with open('hybrid_model_metadata.json') as f:
    meta = json.load(f)

FEATURE_COLS = meta['feature_cols']
TIMESTEPS    = meta['timesteps']
SELL_THR     = meta['stage1']['threshold']

print(f"  LSTM loaded: lstm_regressor.keras")
print(f"  Features   : {len(FEATURE_COLS)}")
print(f"  Timesteps  : {TIMESTEPS}")
print(f"  Features   : {FEATURE_COLS}")

# ── Rebuild data ──────────────────────────────────────────────
print("\n[2/4] Rebuilding test sequences...")

df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values(['product_name', 'date'])

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

df['quantity_sold_log'] = np.log1p(df['quantity_sold'])
df['rolling_3m_log']    = np.log1p(df['rolling_3m'])
df['residual_log']      = df['quantity_sold_log'] - df['rolling_3m_log']
rolling_ratio           = (df['rolling_3m'] + 1e-6) / (df['rolling_6m'] + 1e-6)
df['log_rolling_ratio'] = np.log(rolling_ratio.clip(0.1, 10.0))

mprod = df.groupby('product_name')['date'].nunique()
valid = mprod[mprod >= 12].index
df    = df[df['product_name'].isin(valid)].copy()

max_date     = df['date'].max()
train_cutoff = max_date - pd.DateOffset(months=3)
train_df     = df[df['date'] <= train_cutoff].copy()
test_df      = df[df['date'] >  train_cutoff].copy()

# Non-zero only for regressor evaluation
test_nz = test_df[test_df['quantity_sold'] > 0].copy()
train_nz = train_df[train_df['quantity_sold'] > 0].copy()

def create_sequences(train_data, test_data, feature_cols,
                     target_col, timesteps):
    X_tr, y_tr, X_te, y_te = [], [], [], []
    cutoff = train_data['date'].max()
    all_d  = pd.concat([train_data, test_data]).sort_values(
        ['product_name', 'date'])
    for _, p in all_d.groupby('product_name'):
        feats  = p[feature_cols].values
        target = p[target_col].values
        dates  = p['date'].values
        for i in range(len(feats) - timesteps + 1):
            end = pd.Timestamp(dates[i + timesteps - 1])
            if end <= cutoff:
                X_tr.append(feats[i:i+timesteps])
                y_tr.append(target[i+timesteps-1])
            else:
                X_te.append(feats[i:i+timesteps])
                y_te.append(target[i+timesteps-1])
    return (np.array(X_tr), np.array(y_tr),
            np.array(X_te), np.array(y_te))

X_tr, y_tr_res, X_te, y_te_res = create_sequences(
    train_nz, test_nz, FEATURE_COLS, 'residual_log', TIMESTEPS
)
_, y_tr_roll, _, y_te_roll = create_sequences(
    train_nz, test_nz, FEATURE_COLS, 'rolling_3m_log', TIMESTEPS
)
_, _, _, y_te_actual = create_sequences(
    train_nz, test_nz, FEATURE_COLS, 'quantity_sold', TIMESTEPS
)

# Scale
X_te_s = scaler_reg.transform(
    X_te.reshape(-1, len(FEATURE_COLS))
).reshape(X_te.shape)

print(f"  Test sequences: {X_te_s.shape}")

# ── Baseline SMAPE ────────────────────────────────────────────
print("\n[3/4] Computing baseline LSTM SMAPE...")

baseline_res  = lstm_reg.predict(X_te_s, verbose=0).flatten()
baseline_pred = np.maximum(
    np.expm1(np.clip(baseline_res + y_te_roll, -10, 10)), 0
)
baseline_smape = smape(y_te_actual, baseline_pred)
print(f"  Baseline SMAPE: {baseline_smape:.4f}%")

# ── Permutation importance ────────────────────────────────────
print("\n[4/4] Running permutation importance (30 shuffles per feature)...")
print("  Shuffling each feature and measuring SMAPE increase...")
print("  Big increase = feature was important to LSTM")
print("  No increase  = feature is noise\n")

N_REPEATS   = 30
importances = {}

for feat_idx, feat_name in enumerate(FEATURE_COLS):
    smape_scores = []

    for _ in range(N_REPEATS):
        X_permuted = X_te_s.copy()

        # Shuffle this feature across all samples and timesteps
        for t in range(TIMESTEPS):
            perm = np.random.permutation(X_permuted.shape[0])
            X_permuted[:, t, feat_idx] = X_permuted[perm, t, feat_idx]

        perm_res  = lstm_reg.predict(X_permuted, verbose=0).flatten()
        perm_pred = np.maximum(
            np.expm1(np.clip(perm_res + y_te_roll, -10, 10)), 0
        )
        perm_smape = smape(y_te_actual, perm_pred)
        smape_scores.append(perm_smape - baseline_smape)

    mean_increase = float(np.mean(smape_scores))
    std_increase  = float(np.std(smape_scores))
    importances[feat_name] = {
        'mean_increase' : round(mean_increase, 4),
        'std_increase'  : round(std_increase, 4),
        'important'     : mean_increase > 1.0
    }
    status = "IMPORTANT" if mean_increase > 1.0 else (
             "BORDERLINE" if mean_increase > 0.2 else "NOISE")
    print(f"  {feat_name:<22} +{mean_increase:6.2f}% SMAPE  "
          f"(±{std_increase:.2f})  [{status}]")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "=" * 60)
print("FEATURE IMPORTANCE SUMMARY")
print("=" * 60)

sorted_imp = sorted(
    importances.items(),
    key=lambda x: x[1]['mean_increase'],
    reverse=True
)

keep    = []
maybe   = []
remove  = []

print(f"\n  Baseline SMAPE: {baseline_smape:.4f}%")
print(f"\n  {'Feature':<22} {'SMAPE increase':>15}  Decision")
print(f"  {'-'*55}")

for feat, vals in sorted_imp:
    inc = vals['mean_increase']
    bar = chr(9608) * min(int(inc * 3), 40)
    if inc > 1.0:
        decision = "KEEP     -- significant LSTM contribution"
        keep.append(feat)
    elif inc > 0.2:
        decision = "MAYBE    -- small contribution"
        maybe.append(feat)
    else:
        decision = "REMOVE   -- noise for LSTM"
        remove.append(feat)
    print(f"  {feat:<22} {inc:>+12.2f}%  {decision}  {bar}")

print(f"\n  KEEP   ({len(keep)}): {keep}")
print(f"  MAYBE  ({len(maybe)}): {maybe}")
print(f"  REMOVE ({len(remove)}): {remove}")

print(f"""
  RECOMMENDATION:
  ══════════════════════════════════════════════════════
  Use ONLY the KEEP features in your retrained model.
  MAYBE features can be included if you want to be safe.
  REMOVE features are confirmed noise for the LSTM.

  This answers your teacher's question honestly:
  "We removed features that showed < 0.2% SMAPE increase
   under permutation -- they contribute no information to
   the LSTM and including them risks adding noise."

  Suggested FEATURE_COLS for retraining:
  {keep + maybe}
  ══════════════════════════════════════════════════════
""")

# Save results
results = {
    'baseline_smape'   : baseline_smape,
    'feature_cols_used': FEATURE_COLS,
    'importances'      : {k: v for k, v in sorted_imp},
    'keep'             : keep,
    'maybe'            : maybe,
    'remove'           : remove,
    'recommended_features': keep + maybe,
}
with open('feature_importance_lstm.json', 'w') as f:
    json.dump(results, f, indent=2)
print("  Saved: feature_importance_lstm.json")
print("\n  Next: Update FEATURE_COLS in train_and_save_lstm.py")
print("        with recommended_features, then retrain.")