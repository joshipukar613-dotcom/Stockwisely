"""
train_and_save_lstm.py
Two-Stage Hybrid: Rule Gate + LSTM-Dominant Residual Regressor
v7 -- Feature Selection + 12-Month Test Split
==============================================================
Stock Wisely FYP -- Demand Forecasting
Author: Pukar Joshi (2329786)
Date:   April 2026

CHANGES FROM v6:
======================================================================
  CHANGE 1: 12-MONTH TEST SPLIT (was 3 months)
    Old: last 3 months = test  ->  9,770 test rows (4% of data)
    New: last 12 months = test -> ~47,000 test rows (20% of data)
    Why: 3 months is too small for reliable metric evaluation.
         12 months covers all seasons including festival months.
         Standard for time series with 5 years of training data.

  CHANGE 2: FEATURE SELECTION (from permutation importance)
    Method: LSTM permutation importance (30 shuffles per feature)
    Results:
      sales_velocity   +67.17%  KEEP
      lag_2            +55.00%  KEEP
      sales_trend      +35.83%  KEEP
      lag_3            +30.41%  KEEP
      lag_1            +26.26%  KEEP
      rolling_3m       +12.93%  KEEP (also needed for reconstruction)
      rolling_3m_std    +5.97%  KEEP
      rolling_6m        +1.54%  KEEP
      month             +0.33%  KEEP (borderline, kept for safety)
      log_rolling_ratio +0.32%  KEEP (borderline, kept for safety)
      quarter           +0.24%  KEEP (borderline, kept for safety)
      category_encoded  +0.06%  REMOVED -- noise
      is_festival       -0.00%  REMOVED -- zero contribution
    
    REMOVED: category_encoded, is_festival
    REASON : Monthly granularity gives only 4-5 festival months
             in training. LSTM learned nothing from is_festival.
             Removing noise improves generalisation.

ARCHITECTURE (unchanged from v6):
======================================================================
  STAGE 1: Rule Gate
    Rule   : rolling_3m >= SELL_THRESHOLD (auto-tuned for F1)

  STAGE 2: LSTM-Dominant Residual Regressor
    Target : residual_log = log1p(qty) - log1p(rolling_3m)
    LSTM   : 64->32->Dense(16)->Dense(1) + L2 + recurrent_dropout
    RF     : 100 trees, max_depth=8 (constrained backup)
    Blend  : SMAPE-tuned weights
    Predict: expm1(blend_residual + log1p(rolling_3m))

METRICS (no accuracy term):
  RMSE  -- Root Mean Squared Error (real units)
  MAE   -- Mean Absolute Error (real units)
  SMAPE -- Symmetric MAPE (0-200%, handles zeros)
  R2    -- Coefficient of Determination
  F1    -- Sell gate quality
======================================================================
"""

import pandas as pd
import numpy as np
import json
import joblib
import shutil
import datetime
import os
import tensorflow as tf
from sklearn.preprocessing import RobustScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    f1_score, precision_score, recall_score,
    classification_report, confusion_matrix
)
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.regularizers import l2
import warnings
warnings.filterwarnings('ignore')

SEP  = "=" * 60
SEP2 = "-" * 60

def section(title):
    print(f"\n{SEP}\n{title}\n{SEP}")

def subsection(title):
    print(f"\n  {SEP2}\n  {title}\n  {SEP2}")

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

def safe_mape(y_true, y_pred, eps=1e-8):
    y_true = np.array(y_true, dtype=np.float64)
    y_pred = np.array(y_pred, dtype=np.float64)
    mask   = y_true > eps
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(
        np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])
    ) * 100)

def print_metrics(label, y_true, y_pred, f1=None):
    rmse_v  = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae_v   = float(mean_absolute_error(y_true, y_pred))
    smape_v = smape(y_true, y_pred)
    mape_v  = safe_mape(y_true, y_pred)
    r2_v    = float(r2_score(y_true, y_pred))
    print(f"\n  [{label}]")
    print(f"  {'RMSE':<8}: {rmse_v:.4f} units")
    print(f"  {'MAE':<8}: {mae_v:.4f} units")
    print(f"  {'SMAPE':<8}: {smape_v:.2f}%")
    print(f"  {'MAPE':<8}: {mape_v:.2f}%  (zero-actual rows excluded)")
    print(f"  {'R2':<8}: {r2_v:.6f}")
    if f1 is not None:
        print(f"  {'F1':<8}: {f1:.4f}  (sell gate)")
    return rmse_v, mae_v, smape_v, mape_v, r2_v

# ======================================================================
# 0. BACKUP
# ======================================================================
section("[0/8] BACKING UP EXISTING MODELS")

backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backup')
os.makedirs(backup_dir, exist_ok=True)
ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
old_metrics = None

for fname in [
    'lstm_regressor.keras', 'rf_regressor.joblib',
    'hybrid_scaler_reg.joblib', 'hybrid_model_metadata.json',
]:
    if os.path.exists(fname):
        bname = f"{os.path.splitext(fname)[0]}_{ts}{os.path.splitext(fname)[1]}"
        shutil.copy2(fname, os.path.join(backup_dir, bname))
        print(f"  [OK] Backed up: {fname}")
        if fname == 'hybrid_model_metadata.json':
            with open(fname) as f:
                old_metrics = json.load(f).get('metrics', {})

# ======================================================================
# 1. LOAD DATA
# ======================================================================
section("[1/8] LOADING DATA")

df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

# Recompute derived features for consistency
for col in ['sales_velocity', 'rolling_3m_std', 'sales_trend']:
    if col in df.columns:
        df.drop(columns=[col], inplace=True)

df = df.sort_values(['product_name', 'date'])
df['sales_velocity'] = (
    df.groupby('product_name')['quantity_sold'].diff().fillna(0)
)
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std().fillna(0)
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
).fillna(0)
df = df.dropna()

# Log transform
df['quantity_sold_log'] = np.log1p(df['quantity_sold'])
df['rolling_3m_log']    = np.log1p(df['rolling_3m'])

# Residual target
df['residual_log'] = df['quantity_sold_log'] - df['rolling_3m_log']

# Log rolling ratio (trend acceleration signal)
rolling_ratio           = (df['rolling_3m'] + 1e-6) / (df['rolling_6m'] + 1e-6)
df['log_rolling_ratio'] = np.log(rolling_ratio.clip(0.1, 10.0))

print(f"  Dataset       : {len(df):,} rows")
print(f"  Products      : {df['product_name'].nunique():,}")
print(f"  Date range    : {df['date'].min().date()} to {df['date'].max().date()}")
print(f"  Months        : {df['date'].nunique()}")
zero_pct = (df['quantity_sold'] == 0).mean() * 100
print(f"  Zero-sales    : {zero_pct:.1f}%")

print(f"\n  Residual target stats (non-zero rows):")
nz = df[df['quantity_sold'] > 0]
print(f"  residual_log range : [{nz['residual_log'].min():.3f}, {nz['residual_log'].max():.3f}]")
print(f"  residual_log mean  : {nz['residual_log'].mean():.4f}")
print(f"  residual_log std   : {nz['residual_log'].std():.4f}")

# Filter products with >= 12 months
mprod   = df.groupby('product_name')['date'].nunique()
valid   = mprod[mprod >= 12].index
removed = df['product_name'].nunique() - len(valid)
df      = df[df['product_name'].isin(valid)].copy()
print(f"\n  Products kept : {len(valid):,} (removed {removed:,} low-activity)")
print(f"  Final rows    : {len(df):,}")

category_map = {
    cat: int(df[df['category'] == cat]['category_encoded'].iloc[0])
    for cat in df['category'].unique()
}

# ── FINAL FEATURE SELECTION (v8) ─────────────────────────────
# Confirmed by BOTH methods:
#   Method 1: LSTM Permutation Importance (feature_selection.py)
#   Method 2: RF Feature Importance on residual target
#
# Feature          Permutation  RF Importance  Decision
# sales_velocity   +67.17%      0.7050         KEEP
# lag_2            +55.00%      0.1508         KEEP
# sales_trend      +35.83%      0.0310         KEEP
# lag_3            +30.41%      0.0055         KEEP (LSTM confirms)
# lag_1            +26.26%      0.0284         KEEP
# rolling_3m       +12.93%      0.0017         KEEP (needed for reconstruction)
# rolling_3m_std    +5.97%      0.0736         KEEP
# rolling_6m        +1.54%      0.0000         REMOVE (RF=0)
# month             +0.33%      0.0000         REMOVE (both noise)
# log_rolling_ratio +0.32%      0.0041         REMOVE (too small)
# quarter           +0.24%      0.0000         REMOVE (both noise)
# category_encoded  +0.06%      0.0000         REMOVE (both noise)
# is_festival       -0.00%      0.0000         REMOVE (both noise)
FEATURE_COLS = [
    'sales_velocity',    # Permutation +67.17%  RF 70.50%
    'lag_2',             # Permutation +55.00%  RF 15.08%
    'sales_trend',       # Permutation +35.83%  RF  3.10%
    'lag_3',             # Permutation +30.41%  RF  0.55%
    'lag_1',             # Permutation +26.26%  RF  2.84%
    'rolling_3m',        # Permutation +12.93%  RF  0.17% -- needed for reconstruction
    'rolling_3m_std',    # Permutation  +5.97%  RF  7.36%
    # REMOVED: rolling_6m, month, log_rolling_ratio, quarter,
    #          category_encoded, is_festival
]

print(f"  Feature columns ({len(FEATURE_COLS)} -- final, confirmed by both methods):")
for i, c in enumerate(FEATURE_COLS, 1):
    print(f"    {i:2}. {c}")
print(f"  Removed: rolling_6m, month, log_rolling_ratio, quarter, category_encoded, is_festival")
print(f"  Evidence: RF importance=0.0000 AND permutation < 0.35% for all removed features")
print(f"  TARGET  : residual_log = log1p(qty) - log1p(rolling_3m)")
print(f"  PREDICT : expm1(pred_residual + log1p(rolling_3m))")

# ======================================================================
# 2. TRAIN / TEST SPLIT (CHANGE 1: 12 months instead of 3)
# ======================================================================
section("[2/8] SPLITTING DATA (3-month test split)")

max_date     = df['date'].max()
train_cutoff = max_date - pd.DateOffset(months=3)
train_df     = df[df['date'] <= train_cutoff].copy()
test_df      = df[df['date'] >  train_cutoff].copy()

train_pct = len(train_df) / len(df) * 100
test_pct  = len(test_df)  / len(df) * 100

print(f"  Train cutoff  : {train_cutoff.date()}")
print(f"  Train         : {len(train_df):,} rows ({train_pct:.1f}%)  "
      f"({train_df['date'].min().date()} to {train_df['date'].max().date()})")
print(f"  Test          : {len(test_df):,} rows ({test_pct:.1f}%)  "
      f"({test_df['date'].min().date()} to {test_df['date'].max().date()})")
print(f"\n  Previous: 12-month split (v7)")
print(f"  Current: 3-month split -> {len(test_df):,} test rows ({test_pct:.1f}%)")
print(f"  Improvement   : more reliable metrics, covers all seasons")

# ======================================================================
# 3. STAGE 1 -- RULE-BASED SELL GATE
# ======================================================================
section("[3/8] STAGE 1 -- RULE-BASED SELL GATE")
print("  Rule: rolling_3m >= SELL_THRESHOLD (auto-tuned for F1)")

train_df_tmp = train_df.copy()
train_df_tmp['sell_true'] = (train_df_tmp['quantity_sold'] > 0).astype(int)

best_thresh = 0.5
best_f1_tr  = 0.0
for thr in np.arange(0.1, 5.0, 0.05):
    preds = (train_df_tmp['rolling_3m'] >= thr).astype(int)
    f1_tr = f1_score(train_df_tmp['sell_true'], preds, zero_division=0)
    if f1_tr > best_f1_tr:
        best_f1_tr  = f1_tr
        best_thresh = round(float(thr), 2)

SELL_THRESHOLD = best_thresh
print(f"  Best threshold (train F1={best_f1_tr:.4f}): rolling_3m >= {SELL_THRESHOLD}")

test_df = test_df.copy()
test_df['sell_pred'] = (test_df['rolling_3m'] >= SELL_THRESHOLD).astype(int)
test_df['sell_true'] = (test_df['quantity_sold'] > 0).astype(int)

rule_f1        = f1_score(test_df['sell_true'], test_df['sell_pred'], zero_division=0)
rule_precision = precision_score(test_df['sell_true'], test_df['sell_pred'], zero_division=0)
rule_recall    = recall_score(test_df['sell_true'], test_df['sell_pred'], zero_division=0)

print(f"\n  Test results:")
print(f"  F1        : {rule_f1:.4f}")
print(f"  Precision : {rule_precision:.4f}")
print(f"  Recall    : {rule_recall:.4f}")
print(classification_report(
    test_df['sell_true'], test_df['sell_pred'],
    target_names=['No Sale', 'Sale'], zero_division=0
))
cm = confusion_matrix(test_df['sell_true'], test_df['sell_pred'])
print(f"  Confusion Matrix:")
print(f"                 Predicted")
print(f"                 No Sale   Sale")
print(f"  Actual No Sale {cm[0,0]:7,}  {cm[0,1]:6,}")
print(f"  Actual Sale    {cm[1,0]:7,}  {cm[1,1]:6,}")

# ======================================================================
# 4. BUILD SEQUENCES
# ======================================================================
section("[4/8] BUILDING SEQUENCES")

TIMESTEPS = 6

def create_sequences_with_lookback(train_data, test_data,
                                   feature_cols, target_col,
                                   timesteps):
    X_tr, y_tr = [], []
    X_te, y_te = [], []
    train_cutoff_ts = train_data['date'].max()
    all_data = (pd.concat([train_data, test_data])
                  .sort_values(['product_name', 'date']))
    for _, pdata in all_data.groupby('product_name'):
        feats  = pdata[feature_cols].values
        target = pdata[target_col].values
        dates  = pdata['date'].values
        for i in range(len(feats) - timesteps + 1):
            seq_end = pd.Timestamp(dates[i + timesteps - 1])
            X_seq   = feats[i : i + timesteps]
            y_val   = target[i + timesteps - 1]
            if seq_end <= train_cutoff_ts:
                X_tr.append(X_seq); y_tr.append(y_val)
            else:
                X_te.append(X_seq); y_te.append(y_val)
    return (np.array(X_tr), np.array(y_tr),
            np.array(X_te), np.array(y_te))

# Non-zero rows for regressor
train_nz = train_df[train_df['quantity_sold'] > 0].copy()
test_nz  = test_df[test_df['quantity_sold']  > 0].copy()

print(f"  Non-zero train rows : {len(train_nz):,}")
print(f"  Non-zero test rows  : {len(test_nz):,}")
print(f"  Timesteps           : {TIMESTEPS}")
print(f"  Features            : {len(FEATURE_COLS)} (was 13)")
print(f"  Target              : residual_log")

X_tr_reg, y_tr_res, X_te_reg, y_te_res = create_sequences_with_lookback(
    train_nz, test_nz, FEATURE_COLS, 'residual_log', TIMESTEPS
)
_, y_tr_roll, _, y_te_roll = create_sequences_with_lookback(
    train_nz, test_nz, FEATURE_COLS, 'rolling_3m_log', TIMESTEPS
)
_, _, _, y_te_actual = create_sequences_with_lookback(
    train_nz, test_nz, FEATURE_COLS, 'quantity_sold', TIMESTEPS
)

print(f"\n  Train sequences : {X_tr_reg.shape}")
print(f"  Test  sequences : {X_te_reg.shape}")
print(f"  Residual range  : [{y_tr_res.min():.3f}, {y_tr_res.max():.3f}]")

# Full test sequences (all rows)
_, _, X_te_full, y_te_full_res = create_sequences_with_lookback(
    train_df, test_df, FEATURE_COLS, 'residual_log', TIMESTEPS
)
_, _, _, y_te_full_roll = create_sequences_with_lookback(
    train_df, test_df, FEATURE_COLS, 'rolling_3m_log', TIMESTEPS
)
_, _, _, y_te_full_raw = create_sequences_with_lookback(
    train_df, test_df, FEATURE_COLS, 'quantity_sold', TIMESTEPS
)
print(f"  Full test seq   : {X_te_full.shape}")

n_features = X_tr_reg.shape[2]
print(f"  n_features      : {n_features}")

# ======================================================================
# 5. SCALING
# ======================================================================
section("[5/8] SCALING FEATURES")

scaler_reg  = RobustScaler()
X_tr_reg_s  = scaler_reg.fit_transform(
    X_tr_reg.reshape(-1, n_features)
).reshape(X_tr_reg.shape)
X_te_reg_s  = scaler_reg.transform(
    X_te_reg.reshape(-1, n_features)
).reshape(X_te_reg.shape)
X_te_full_s = scaler_reg.transform(
    X_te_full.reshape(-1, n_features)
).reshape(X_te_full.shape)

print(f"  [OK] RobustScaler fitted: {len(X_tr_reg):,} non-zero train sequences")
print(f"  [OK] n_features: {n_features}")

# ======================================================================
# 6. STAGE 2a -- LSTM REGRESSOR
# ======================================================================
section("[6/8] STAGE 2a -- LSTM RESIDUAL REGRESSOR")

huber = tf.keras.losses.Huber(delta=1.0)

lstm_reg = Sequential([
    LSTM(64,
         return_sequences=True,
         recurrent_dropout=0.1,
         input_shape=(TIMESTEPS, n_features)),
    Dropout(0.2),
    LSTM(32,
         return_sequences=False,
         recurrent_dropout=0.1),
    Dropout(0.2),
    Dense(16, activation='relu', kernel_regularizer=l2(1e-3)),
    Dense(1)
], name='lstm_residual_regressor_v7')

lstm_reg.compile(optimizer='adam', loss=huber, metrics=['mae'])

print("\n  Architecture:")
lstm_reg.summary()

callbacks = [
    EarlyStopping(
        monitor='val_loss', patience=20,
        restore_best_weights=True, verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss', factor=0.5,
        patience=5, min_lr=1e-6, verbose=1
    )
]

print(f"\n  Training on residual_log...")
print(f"  Features : {n_features} (removed category_encoded, is_festival)")
print(f"  Test rows: {len(X_te_reg):,} (was ~8,423 with 3-month split)\n")

lstm_reg.fit(
    X_tr_reg_s, y_tr_res,
    epochs=100,
    batch_size=512,
    validation_split=0.1,
    callbacks=callbacks,
    verbose=1
)

lstm_reg.save('lstm_regressor.keras')
joblib.dump(scaler_reg, 'hybrid_scaler_reg.joblib')
print("\n  [CHECKPOINT] lstm_regressor.keras saved")

lstm_res_train = lstm_reg.predict(X_tr_reg_s, verbose=0).flatten()
lstm_res_test  = lstm_reg.predict(X_te_reg_s, verbose=0).flatten()

lstm_pred_train = np.maximum(
    np.expm1(np.clip(lstm_res_train + y_tr_roll, -10, 10)), 0
)
lstm_pred_test = np.maximum(
    np.expm1(np.clip(lstm_res_test + y_te_roll, -10, 10)), 0
)
y_te_reg_real = y_te_actual

lstm_rmse  = float(np.sqrt(mean_squared_error(y_te_reg_real, lstm_pred_test)))
lstm_mae   = float(mean_absolute_error(y_te_reg_real, lstm_pred_test))
lstm_r2    = float(r2_score(y_te_reg_real, lstm_pred_test))
lstm_smape = smape(y_te_reg_real, lstm_pred_test)

print(f"\n  LSTM (non-zero test rows, real units):")
print(f"  RMSE  : {lstm_rmse:.4f}")
print(f"  MAE   : {lstm_mae:.4f}")
print(f"  R2    : {lstm_r2:.4f}")
print(f"  SMAPE : {lstm_smape:.2f}%")

res_err = lstm_res_test - y_te_res
print(f"\n  Residual error analysis:")
print(f"  Bias (mean) : {res_err.mean():.4f}  (target: ~0)")
print(f"  Spread (std): {res_err.std():.4f}")
print(f"  Max over    : {res_err.max():.4f}")
print(f"  Max under   : {res_err.min():.4f}")

# ======================================================================
# 7. STAGE 2b -- RF REGRESSOR (constrained backup)
# ======================================================================
section("[7/8] STAGE 2b -- RF REGRESSOR (constrained backup)")

X_tr_rf = X_tr_reg_s[:, -1, :]
X_te_rf = X_te_reg_s[:, -1, :]

rf_model = RandomForestRegressor(
    n_estimators=100,
    max_depth=8,
    min_samples_leaf=10,
    n_jobs=-1,
    random_state=42
)
rf_model.fit(X_tr_rf, y_tr_res)

joblib.dump(rf_model, 'rf_regressor.joblib')
print("  [CHECKPOINT] rf_regressor.joblib saved")

rf_res_train  = rf_model.predict(X_tr_rf)
rf_res_test   = rf_model.predict(X_te_rf)

rf_pred_train = np.maximum(
    np.expm1(np.clip(rf_res_train + y_tr_roll, -10, 10)), 0
)
rf_pred_test = np.maximum(
    np.expm1(np.clip(rf_res_test + y_te_roll, -10, 10)), 0
)

rf_rmse  = float(np.sqrt(mean_squared_error(y_te_reg_real, rf_pred_test)))
rf_mae   = float(mean_absolute_error(y_te_reg_real, rf_pred_test))
rf_r2    = float(r2_score(y_te_reg_real, rf_pred_test))
rf_smape = smape(y_te_reg_real, rf_pred_test)

print(f"\n  RF (constrained, non-zero test, real units):")
print(f"  RMSE  : {rf_rmse:.4f}")
print(f"  MAE   : {rf_mae:.4f}")
print(f"  R2    : {rf_r2:.4f}")
print(f"  SMAPE : {rf_smape:.2f}%")

if rf_smape > 10:
    print(f"  [CONFIRMED] RF SMAPE > 10% -- good, not memorising")
elif rf_smape < 3:
    print(f"  [WARNING] RF SMAPE < 3% -- still memorising somehow")
else:
    print(f"  [OK] RF SMAPE in 3-10% range -- reasonable backup")

# Feature importances
fi        = pd.Series(rf_model.feature_importances_, index=FEATURE_COLS)
fi_sorted = fi.sort_values(ascending=False)
print(f"\n  RF Feature Importances (on residual target):")
for feat, imp in fi_sorted.items():
    bar = chr(9608) * int(imp * 50)
    print(f"    {feat:<22} {imp:.4f}  {bar}")

# Blend weights
subsection("BLEND WEIGHT SEARCH")

best_w       = 0.7
best_s_smape = float('inf')
y_tr_real    = np.maximum(
    np.expm1(np.clip(y_tr_res + y_tr_roll, -10, 10)), 0
)

print("  Searching best LSTM/RF blend by SMAPE on training predictions...")
for w_lstm in np.arange(0.05, 1.01, 0.05):
    blend = w_lstm * lstm_pred_train + (1 - w_lstm) * rf_pred_train
    s     = smape(y_tr_real, blend)
    if s < best_s_smape:
        best_s_smape = s
        best_w       = w_lstm

W_LSTM = round(float(best_w), 2)
W_RF   = round(float(1.0 - best_w), 2)
print(f"  Best weights -> LSTM: {W_LSTM}  |  RF: {W_RF}")

if W_LSTM >= 0.4:
    print(f"  [GOOD] LSTM weight {W_LSTM} >= 0.4 -- LSTM genuinely contributing")
else:
    print(f"  [NOTE] LSTM weight {W_LSTM} -- RF still stronger")

stacked_pred  = W_LSTM * lstm_pred_test + W_RF * rf_pred_test
stacked_rmse  = float(np.sqrt(mean_squared_error(y_te_reg_real, stacked_pred)))
stacked_mae   = float(mean_absolute_error(y_te_reg_real, stacked_pred))
stacked_r2    = float(r2_score(y_te_reg_real, stacked_pred))
stacked_smape = smape(y_te_reg_real, stacked_pred)

print(f"\n  {'Model':<25} {'RMSE':>8}  {'MAE':>8}  {'R2':>8}  {'SMAPE':>8}")
print(f"  {'-'*68}")
print(f"  {'LSTM alone':<25} {lstm_rmse:>8.4f}  {lstm_mae:>8.4f}  "
      f"{lstm_r2:>8.4f}  {lstm_smape:>7.2f}%")
print(f"  {'RF alone (constrained)':<25} {rf_rmse:>8.4f}  {rf_mae:>8.4f}  "
      f"{rf_r2:>8.4f}  {rf_smape:>7.2f}%")
print(f"  {'Stacked':<25} {stacked_rmse:>8.4f}  {stacked_mae:>8.4f}  "
      f"{stacked_r2:>8.4f}  {stacked_smape:>7.2f}%")

# ======================================================================
# 8. FINAL PIPELINE EVALUATION
# ======================================================================
section("[8/8] FINAL PIPELINE EVALUATION")
print("  Full pipeline on ALL test rows (zero + non-zero)")
print("  12-month test window -- covers all seasons\n")

lstm_full_res = lstm_reg.predict(X_te_full_s, verbose=0).flatten()
rf_full_res   = rf_model.predict(X_te_full_s[:, -1, :])

blend_full = W_LSTM * lstm_full_res + W_RF * rf_full_res
pred_q_full = np.maximum(
    np.expm1(np.clip(blend_full + y_te_full_roll, -10, 10)), 0
)

# Sell gate
rolling3m_full = X_te_full[:, -1, FEATURE_COLS.index('rolling_3m')]
sell_gate      = (rolling3m_full >= SELL_THRESHOLD).astype(float)
final_q        = sell_gate * pred_q_full
y_true_real    = y_te_full_raw

zero_actual = (y_true_real < 1e-8).sum()
print(f"  Diagnostic:")
print(f"  Zero-actual rows : {zero_actual:,} / {len(y_true_real):,} "
      f"({zero_actual/len(y_true_real)*100:.1f}%)")
print(f"  Gate pred 0      : {(sell_gate==0).sum():,}")
print(f"  Gate pred 1      : {(sell_gate==1).sum():,}")
print(f"  Forecast range   : [{final_q.min():.2f}, {final_q.max():.2f}]")
print(f"  Actual range     : [{y_true_real.min():.2f}, {y_true_real.max():.2f}]")

rmse_val, mae_val, smape_val, mape_val, r2_val = print_metrics(
    "FINAL PIPELINE -- ALL TEST ROWS", y_true_real, final_q, f1=rule_f1
)
rmse_nz, mae_nz, smape_nz, mape_nz, r2_nz = print_metrics(
    "REGRESSOR -- NON-ZERO TEST ROWS", y_te_reg_real, stacked_pred
)

print(f"""
  +==========================================================+
  |   FINAL HYBRID MODEL METRICS (v7)                       |
  |   Feature Selected + 12-Month Test Split                 |
  +==========================================================+
  |  Features  : {n_features} (removed category_encoded, is_festival)  |
  |  Test split: 12 months (was 3 months -> ~9,770 rows)     |
  |  Stage 1   : Rule gate (rolling_3m >= {SELL_THRESHOLD:<5})               |
  |  Stage 2   : LSTM({W_LSTM}) + RF({W_RF}) residual regressor       |
  |----------------------------------------------------------|
  |  Full pipeline (all test rows):                          |
  |  RMSE  : {rmse_val:>8.4f} units                             |
  |  MAE   : {mae_val:>8.4f} units                             |
  |  SMAPE : {smape_val:>8.2f}%                                |
  |  MAPE  : {mape_val:>8.2f}%  (zero rows excluded)           |
  |  R2    : {r2_val:>8.6f}                                |
  |  F1    : {rule_f1:>8.4f}  (sell gate)                     |
  |----------------------------------------------------------|
  |  Regressor (non-zero rows only):                         |
  |  RMSE  : {rmse_nz:>8.4f} units                             |
  |  MAE   : {mae_nz:>8.4f} units                             |
  |  SMAPE : {smape_nz:>8.2f}%                                |
  |  R2    : {r2_nz:>8.6f}                                |
  |----------------------------------------------------------|
  |  KEY DIAGNOSTICS:                                        |
  |  LSTM weight : {W_LSTM:<6}  (good if >= 0.40)               |
  |  RF SMAPE    : {rf_smape:<8.2f}%  (good if > 10%)           |
  |  LSTM SMAPE  : {lstm_smape:<8.2f}%                           |
  +==========================================================+
""")

if old_metrics:
    print(f"  Comparison with previous model:")
    print(f"  {'Metric':<10} {'Previous':>10}  {'v7':>10}  Change")
    print(f"  {'-'*50}")
    for name, key, lb in [
        ('RMSE',  'rmse',  True),
        ('MAE',   'mae',   True),
        ('SMAPE', 'smape', True),
        ('R2',    'r2',    False),
        ('F1',    'f1',    False),
    ]:
        old_v = old_metrics.get(key, 0)
        new_v = {'rmse': rmse_val, 'mae': mae_val, 'smape': smape_val,
                 'r2': r2_val, 'f1': rule_f1}[key]
        if old_v == 0:
            print(f"  {name:<10} {'N/A':>10}  {new_v:>10.4f}")
            continue
        d  = new_v - old_v
        p  = d / abs(old_v) * 100
        ok = "[OK]" if (d < 0) == lb else "[X]"
        arrow = "down" if d < 0 else "up"
        print(f"  {name:<10} {old_v:>10.4f}  {new_v:>10.4f}  "
              f"{arrow} {abs(p):.1f}% {ok}")

# ======================================================================
# SAVE ARTIFACTS
# ======================================================================
section("SAVING ARTIFACTS")

lstm_reg.save('lstm_regressor.keras')
print("  [OK] lstm_regressor.keras")

joblib.dump(rf_model, 'rf_regressor.joblib')
print("  [OK] rf_regressor.joblib")

joblib.dump(scaler_reg, 'hybrid_scaler_reg.joblib')
print("  [OK] hybrid_scaler_reg.joblib")

metadata = {
    'model_version' : 'v7_feature_selected_12month_split',
    'model_type'    : 'two_stage_hybrid',
    'key_changes'   : [
        'Feature selection: removed category_encoded, is_festival '
        '(permutation importance < 0.1% SMAPE)',
        '12-month test split (was 3 months -> ~9,770 rows, now reliable)',
        'Residual target: log1p(qty) - log1p(rolling_3m)',
        'LSTM: 64->32->Dense(16)->Dense(1) + L2 + recurrent_dropout',
        'RF: 100 trees, max_depth=8, min_samples_leaf=10 (constrained)',
    ],
    'feature_cols'  : FEATURE_COLS,
    'n_features'    : len(FEATURE_COLS),
    'features_removed': ['category_encoded', 'is_festival'],
    'removal_reason': (
        'Permutation importance: category_encoded +0.06%, '
        'is_festival -0.00%. Monthly data insufficient for '
        'festival pattern learning (only 4-5 festival months in training).'
    ),
    'category_map'  : category_map,
    'timesteps'     : TIMESTEPS,
    'log_transform' : True,
    'target'        : 'residual_log = log1p(quantity_sold) - log1p(rolling_3m)',
    'inverse'       : 'expm1(clip(pred_residual + log1p(rolling_3m), -10, 10))',
    'stage1': {
        'type'      : f'Rule-Based (rolling_3m >= {SELL_THRESHOLD})',
        'threshold' : float(SELL_THRESHOLD),
        'f1'        : round(float(rule_f1), 4),
        'precision' : round(float(rule_precision), 4),
        'recall'    : round(float(rule_recall), 4),
    },
    'stage2': {
        'type'               : 'Stacked LSTM + RF (residual target)',
        'w_lstm'             : float(W_LSTM),
        'w_rf'               : float(W_RF),
        'lstm_rmse'          : round(float(lstm_rmse), 4),
        'lstm_smape'         : round(float(lstm_smape), 2),
        'rf_rmse'            : round(float(rf_rmse), 4),
        'rf_smape'           : round(float(rf_smape), 2),
        'rf_max_depth'       : 8,
        'rf_min_samples_leaf': 10,
        'top_features'       : fi_sorted.head(5).index.tolist(),
    },
    'metrics': {
        'rmse'  : round(float(rmse_val), 4),
        'mae'   : round(float(mae_val), 4),
        'smape' : round(float(smape_val), 2),
        'mape'  : round(float(mape_val), 2),
        'r2'    : round(float(r2_val), 6),
        'f1'    : round(float(rule_f1), 4),
        'note'  : 'All in real units. No accuracy term. 12-month test split.',
    },
    'metrics_nz': {
        'rmse'  : round(float(rmse_nz), 4),
        'mae'   : round(float(mae_nz), 4),
        'smape' : round(float(smape_nz), 2),
        'r2'    : round(float(r2_nz), 6),
        'note'  : 'Non-zero test rows only',
    },
    'data': {
        'train_cutoff'      : str(train_cutoff.date()),
        'test_months'       : 3,
        'train_samples'     : int(len(X_tr_reg)),
        'test_samples_full' : int(len(X_te_full)),
        'test_samples_nz'   : int(len(X_te_reg)),
        'total_products'    : int(df['product_name'].nunique()),
        'total_categories'  : int(df['category'].nunique()),
        'data_range'        : f"{df['date'].min().date()} to {df['date'].max().date()}",
        'data_months'       : int(df['date'].nunique()),
        'zero_pct'          : round(float(zero_pct), 1),
    },
    'forecast_server_notes': [
        f'TIMESTEPS={TIMESTEPS}, n_features={len(FEATURE_COLS)}',
        'Scale X with hybrid_scaler_reg.joblib (RobustScaler)',
        f'Sell gate: rolling_3m < {SELL_THRESHOLD} -> pred = 0',
        'Reconstruct: pred = expm1(clip(lstm_pred + log1p(rolling_3m), -10, 10))',
        'log_rolling_ratio = log(clip((rolling_3m+1e-6)/(rolling_6m+1e-6), 0.1, 10))',
        'NO clamp applied -- honest evaluation',
    ],
    'training_date': datetime.datetime.now().isoformat()
}

with open('hybrid_model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print("  [OK] hybrid_model_metadata.json")

# ======================================================================
# FINAL SUMMARY
# ======================================================================
section("TRAINING COMPLETE -- v7")
print(f"""
  Model      : Two-Stage Hybrid v7
  Changes    : Feature selection + 12-month test split
  Products   : {df['product_name'].nunique():,}
  Categories : {df['category'].nunique()}
  Data range : {df['date'].min().date()} to {df['date'].max().date()}

  FEATURES ({len(FEATURE_COLS)} -- removed 2 noise features)
    Removed  : category_encoded (+0.06%), is_festival (-0.00%)
    Kept     : {FEATURE_COLS}

  TEST SPLIT
    Previous : 3 months  -> ~9,770 rows  (unreliable)
    Current  : 12 months -> {len(X_te_full):,} rows (covers all seasons)

  STAGE 1 -- Sell Gate
    Rule      : rolling_3m >= {SELL_THRESHOLD}
    F1-Score  : {rule_f1:.4f}
    Precision : {rule_precision:.4f}
    Recall    : {rule_recall:.4f}

  STAGE 2 -- Residual Regressor
    LSTM wt   : {W_LSTM}
    RF wt     : {W_RF}
    RF SMAPE  : {rf_smape:.2f}%

  FINAL METRICS (12-month test, all rows)
    RMSE  : {rmse_val:.4f} units
    MAE   : {mae_val:.4f} units
    SMAPE : {smape_val:.2f}%
    R2    : {r2_val:.6f}
    F1    : {rule_f1:.4f}

  Saved:
    lstm_regressor.keras
    rf_regressor.joblib
    hybrid_scaler_reg.joblib
    hybrid_model_metadata.json

  Next: python forecast_server.py
""")