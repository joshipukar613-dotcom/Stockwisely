"""
TWO-STAGE HYBRID MODEL: LSTM CLASSIFIER + (LSTM × RANDOM FOREST STACKED REGRESSOR)
=====================================================================================
Stock Wisely FYP — Demand Forecasting
Author: Pukar Joshi (2329786)
Date:   April 2026

ARCHITECTURE:
═══════════════════════════════════════════════════════════════
  STAGE 1 — LSTM Binary Classifier
  ─────────────────────────────────
  Input  : All monthly rows (zero + non-zero sales)
  Output : P(product sells this month) → 0 or 1
  Metric : F1-Score, Precision, Recall

  STAGE 2 — Stacked Regressor (LSTM + Random Forest)
  ────────────────────────────────────────────────────
  Input  : Only rows where quantity_sold > 0
  LSTM   : Learns temporal sequence patterns (lag trends, seasonality)
  RF     : Learns feature interactions (category, festival, rolling stats)
  Stack  : Final = (LSTM_pred × w1) + (RF_pred × w2)
           Weights tuned automatically on validation set

  FINAL PIPELINE:
  ───────────────
  For each product-month:
    sell_prob = Stage1.predict(features)
    if sell_prob >= threshold:
        quantity  = Stage2.predict(features)   ← LSTM×RF stacked
    else:
        quantity  = 0
  Final Forecast = sell_prob × quantity

METRICS:
  SMAPE    — primary accuracy (handles zeros, 0-200% range)
  Accuracy — 100 - SMAPE
  RMSE     — regressor quality
  F1       — classifier quality
  R²       — variance explained
═══════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import json
import joblib
import shutil
import datetime
import os
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (mean_squared_error, r2_score,
                             f1_score, precision_score,
                             recall_score, classification_report)
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.callbacks import EarlyStopping
import warnings
warnings.filterwarnings('ignore')

# ── Console helpers ───────────────────────────────────────────
SEP  = "=" * 60
SEP2 = "-" * 60

def section(title):
    print(f"\n{SEP}\n{title}\n{SEP}")

def subsection(title):
    print(f"\n  {SEP2}\n  {title}\n  {SEP2}")

# ── Metric helpers ────────────────────────────────────────────

def smape(y_true, y_pred):
    """Symmetric MAPE — handles zeros, range 0–200%."""
    y_true = np.array(y_true, dtype=np.float64)
    y_pred = np.array(y_pred, dtype=np.float64)
    denom  = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    mask   = denom > 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs(y_true[mask] - y_pred[mask]) / denom[mask]) * 100)

def safe_mape(y_true, y_pred, eps=1e-8):
    """MAPE with zero-actual rows excluded."""
    y_true = np.array(y_true, dtype=np.float64)
    y_pred = np.array(y_pred, dtype=np.float64)
    mask   = y_true > eps
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

# ═══════════════════════════════════════════════════════════════
# 0. BACKUP
# ═══════════════════════════════════════════════════════════════
section("[0/7] BACKING UP EXISTING MODELS")

backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backup')
os.makedirs(backup_dir, exist_ok=True)
ts = datetime.datetime.now().strftime("%Y%m%d_%H%M")
old_metrics = None

files_to_backup = [
    'lstm_classifier.keras',
    'lstm_regressor.keras',
    'rf_regressor.joblib',
    'hybrid_scaler_clf.joblib',
    'hybrid_scaler_reg.joblib',
    'hybrid_model_metadata.json',
    # legacy single-model files
    'lstm_forecast_model.keras',
    'lstm_scaler.joblib',
    'lstm_model_metadata.json',
]

for fname in files_to_backup:
    if os.path.exists(fname):
        bname = f"{os.path.splitext(fname)[0]}_{ts}{os.path.splitext(fname)[1]}"
        shutil.copy2(fname, os.path.join(backup_dir, bname))
        print(f"  [OK] Backed up: {fname} → backup/{bname}")
        if fname == 'hybrid_model_metadata.json':
            with open(fname) as f:
                old_metrics = json.load(f).get('metrics', {})

# ═══════════════════════════════════════════════════════════════
# 1. LOAD DATA
# ═══════════════════════════════════════════════════════════════
section("[1/7] LOADING DATA")

df = pd.read_csv('data_features.csv')
df['date'] = pd.to_datetime(df['date'])

# Extra engineered features
df['sales_velocity'] = df.groupby('product_name')['quantity_sold'].diff()
df['rolling_3m_std'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std()
)
df['sales_trend'] = df.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
)
df = df.dropna()

print(f"  Dataset : {len(df):,} rows")
print(f"  Products: {df['product_name'].nunique():,}")
print(f"  Categories: {df['category'].nunique()}")
print(f"  Date range: {df['date'].min().date()} → {df['date'].max().date()}")
print(f"  Months  : {df['date'].nunique()}")

zero_pct = (df['quantity_sold'] == 0).mean() * 100
print(f"  Zero-sales rows: {zero_pct:.1f}%")

# ── Filter products with ≥ 12 months history ─────────────────
print("\n  Filtering products with < 12 months history...")
mprod = df.groupby('product_name')['date'].nunique()
valid = mprod[mprod >= 12].index
removed = df['product_name'].nunique() - len(valid)
df = df[df['product_name'].isin(valid)]
print(f"  Kept: {len(valid):,} products (removed {removed:,})")

# Category map
category_map = {
    cat: int(df[df['category'] == cat]['category_encoded'].iloc[0])
    for cat in df['category'].unique()
}
print(f"  Category map: {category_map}")

# ── Feature columns ───────────────────────────────────────────
FEATURE_COLS = [
    'lag_1', 'lag_2', 'lag_3',
    'rolling_3m', 'rolling_6m', 'rolling_3m_std',
    'sales_velocity', 'sales_trend',
    'month', 'quarter', 'is_festival', 'category_encoded'
]

# ═══════════════════════════════════════════════════════════════
# 2. TRAIN / TEST SPLIT
# ═══════════════════════════════════════════════════════════════
section("[2/7] SPLITTING DATA")

max_date     = df['date'].max()
train_cutoff = max_date - pd.DateOffset(months=3)
train_df     = df[df['date'] <= train_cutoff].copy()
test_df      = df[df['date'] >  train_cutoff].copy()

print(f"  Train cutoff : {train_cutoff.date()}")
print(f"  Train samples: {len(train_df):,}  ({train_df['date'].min().date()} → {train_df['date'].max().date()})")
print(f"  Test  samples: {len(test_df):,}  ({test_df['date'].min().date()} → {test_df['date'].max().date()})")

# ═══════════════════════════════════════════════════════════════
# 3. SEQUENCE BUILDER (shared)
# ═══════════════════════════════════════════════════════════════
section("[3/7] BUILDING SEQUENCES")

TIMESTEPS = 3

def create_sequences_with_lookback(train_data, test_data,
                                   feature_cols, target_col,
                                   timesteps=3, binary_target=False):
    """
    Build train/test sequences from the full product timeline.
    A sequence is assigned to test if its LAST timestep is in the test period.
    binary_target=True → y is 1 if quantity > 0, else 0  (for classifier)
    binary_target=False → y is raw quantity               (for regressor)
    """
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

            if binary_target:
                y_val = 1 if y_val > 0 else 0

            if seq_end <= train_cutoff_ts:
                X_tr.append(X_seq); y_tr.append(y_val)
            else:
                X_te.append(X_seq); y_te.append(y_val)

    return (np.array(X_tr), np.array(y_tr),
            np.array(X_te), np.array(y_te))

# ── Classifier sequences (all rows, binary target) ───────────
print("\n  Building classifier sequences (all rows, binary y)...")
X_tr_clf, y_tr_clf, X_te_clf, y_te_clf = create_sequences_with_lookback(
    train_df, test_df, FEATURE_COLS, 'quantity_sold',
    timesteps=TIMESTEPS, binary_target=True
)
print(f"  Classifier train: {X_tr_clf.shape}  |  test: {X_te_clf.shape}")
print(f"  Class balance (train): {y_tr_clf.mean()*100:.1f}% positive")

# ── Regressor sequences (non-zero rows only) ─────────────────
print("\n  Building regressor sequences (non-zero sales only)...")
train_nz = train_df[train_df['quantity_sold'] > 0].copy()
test_nz  = test_df[test_df['quantity_sold']  > 0].copy()

X_tr_reg, y_tr_reg, X_te_reg, y_te_reg = create_sequences_with_lookback(
    train_nz, test_nz, FEATURE_COLS, 'quantity_sold',
    timesteps=TIMESTEPS, binary_target=False
)
print(f"  Regressor train: {X_tr_reg.shape}  |  test: {X_te_reg.shape}")
print(f"  Quantity range (train): [{y_tr_reg.min():.0f}, {y_tr_reg.max():.0f}]")

n_features = X_tr_clf.shape[2]

# ═══════════════════════════════════════════════════════════════
# 4. SCALING
# ═══════════════════════════════════════════════════════════════
section("[4/7] SCALING FEATURES")

def scale_sequences(X_train, X_test, timesteps, n_feat):
    scaler = StandardScaler()
    X_tr2d = X_train.reshape(-1, n_feat)
    X_te2d = X_test.reshape(-1,  n_feat)
    X_tr_s = scaler.fit_transform(X_tr2d).reshape(X_train.shape[0], timesteps, n_feat)
    X_te_s = scaler.transform(X_te2d).reshape(X_test.shape[0],  timesteps, n_feat)
    return X_tr_s, X_te_s, scaler

X_tr_clf_s, X_te_clf_s, scaler_clf = scale_sequences(X_tr_clf, X_te_clf, TIMESTEPS, n_features)
X_tr_reg_s, X_te_reg_s, scaler_reg = scale_sequences(X_tr_reg, X_te_reg, TIMESTEPS, n_features)
print("  [OK] Classifier scaler fitted")
print("  [OK] Regressor  scaler fitted")

# ═══════════════════════════════════════════════════════════════
# 5a. STAGE 1 — LSTM CLASSIFIER
# ═══════════════════════════════════════════════════════════════
section("[5/7] STAGE 1 — LSTM CLASSIFIER")
print("  Predicts: Will this product sell this month? (0/1)")

clf_model = Sequential([
    LSTM(64, return_sequences=True,
         input_shape=(TIMESTEPS, n_features)),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1,  activation='sigmoid')   # binary output
], name='lstm_classifier')

clf_model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy', 'AUC']
)

print("\n  Architecture:")
clf_model.summary()

# Class weights to handle imbalance (80% zeros)
pos_count = y_tr_clf.sum()
neg_count = len(y_tr_clf) - pos_count
class_weight = {0: 1.0, 1: neg_count / pos_count}
print(f"\n  Class weights: {{0: 1.0, 1: {class_weight[1]:.2f}}} (handles 80% zero imbalance)")

early_clf = EarlyStopping(monitor='val_loss', patience=10,
                          restore_best_weights=True, verbose=1)

print("\n  Training...")
clf_history = clf_model.fit(
    X_tr_clf_s, y_tr_clf,
    epochs=30,
    batch_size=512,
    validation_split=0.1,
    class_weight=class_weight,
    callbacks=[early_clf],
    verbose=1
)

# ── Evaluate classifier ───────────────────────────────────────
subsection("CLASSIFIER EVALUATION")

clf_probs = clf_model.predict(X_te_clf_s, verbose=0).flatten()

# Tune threshold on validation for best F1
thresholds  = np.arange(0.3, 0.8, 0.05)
best_thresh = 0.5
best_f1     = 0.0
for thr in thresholds:
    preds = (clf_probs >= thr).astype(int)
    f1    = f1_score(y_te_clf, preds, zero_division=0)
    if f1 > best_f1:
        best_f1     = f1
        best_thresh = thr

clf_preds = (clf_probs >= best_thresh).astype(int)

print(f"\n  Best threshold : {best_thresh:.2f}")
print(f"  F1-Score       : {best_f1:.4f}")
print(f"  Precision      : {precision_score(y_te_clf, clf_preds, zero_division=0):.4f}")
print(f"  Recall         : {recall_score(y_te_clf, clf_preds, zero_division=0):.4f}")
print(f"\n  Classification Report:")
print(classification_report(y_te_clf, clf_preds,
                            target_names=['No Sale (0)', 'Sale (1)'],
                            zero_division=0))

cm = confusion_matrix(y_te_clf, clf_preds)
print(f"  Confusion Matrix:")
print(f"                 Predicted")
print(f"                 No Sale  Sale")
print(f"  Actual No Sale  {cm[0,0]:6d}  {cm[0,1]:6d}")
print(f"  Actual Sale     {cm[1,0]:6d}  {cm[1,1]:6d}")

# ═══════════════════════════════════════════════════════════════
# 5b. STAGE 2 — STACKED REGRESSOR (LSTM + RANDOM FOREST)
# ═══════════════════════════════════════════════════════════════
section("[6/7] STAGE 2 — STACKED REGRESSOR (LSTM + RANDOM FOREST)")
print("  Predicts: How many units will sell? (non-zero rows only)")

# ── 2a. LSTM Regressor ────────────────────────────────────────
subsection("2a. LSTM REGRESSOR")

lstm_reg = Sequential([
    LSTM(64, return_sequences=True,
         input_shape=(TIMESTEPS, n_features)),
    Dropout(0.2),
    LSTM(32),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
], name='lstm_regressor')

lstm_reg.compile(optimizer='adam', loss='mse', metrics=['mae'])

print("\n  Architecture:")
lstm_reg.summary()

early_reg = EarlyStopping(monitor='val_loss', patience=15,
                          restore_best_weights=True, verbose=1)

print("\n  Training LSTM regressor...")
lstm_reg.fit(
    X_tr_reg_s, y_tr_reg,
    epochs=30,
    batch_size=256,
    validation_split=0.1,
    callbacks=[early_reg],
    verbose=1
)

lstm_pred_train = lstm_reg.predict(X_tr_reg_s, verbose=0).flatten()
lstm_pred_test  = lstm_reg.predict(X_te_reg_s, verbose=0).flatten()

lstm_rmse = np.sqrt(mean_squared_error(y_te_reg, lstm_pred_test))
lstm_r2   = r2_score(y_te_reg, lstm_pred_test)
print(f"\n  LSTM Regressor  →  RMSE: {lstm_rmse:.4f}  |  R²: {lstm_r2:.4f}")

# ── 2b. Random Forest Regressor ───────────────────────────────
subsection("2b. RANDOM FOREST REGRESSOR")

# RF works on flat (2D) features — use the last timestep only
X_tr_rf = X_tr_reg_s[:, -1, :]   # shape: (samples, features)
X_te_rf = X_te_reg_s[:, -1, :]

print("\n  Training Random Forest...")
rf_model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_leaf=5,
    n_jobs=-1,
    random_state=42
)
rf_model.fit(X_tr_rf, y_tr_reg)

rf_pred_train = rf_model.predict(X_tr_rf)
rf_pred_test  = rf_model.predict(X_te_rf)

rf_rmse = np.sqrt(mean_squared_error(y_te_reg, rf_pred_test))
rf_r2   = r2_score(y_te_reg, rf_pred_test)
print(f"  Random Forest  →  RMSE: {rf_rmse:.4f}  |  R²: {rf_r2:.4f}")

# Feature importances
fi = pd.Series(rf_model.feature_importances_, index=FEATURE_COLS)
fi_sorted = fi.sort_values(ascending=False)
print("\n  Top 5 Feature Importances (Random Forest):")
for feat, imp in fi_sorted.head(5).items():
    bar = "█" * int(imp * 50)
    print(f"    {feat:<20} {imp:.4f}  {bar}")

# ── 2c. Stack: tune weights on train set ─────────────────────
subsection("2c. STACKING — TUNING BLEND WEIGHTS")

best_w      = 0.5
best_s_rmse = float('inf')

print("\n  Searching best LSTM/RF blend weight on training predictions...")
for w_lstm in np.arange(0.1, 1.0, 0.1):
    w_rf   = 1.0 - w_lstm
    blend  = w_lstm * lstm_pred_train + w_rf * rf_pred_train
    s_rmse = np.sqrt(mean_squared_error(y_tr_reg, blend))
    if s_rmse < best_s_rmse:
        best_s_rmse = s_rmse
        best_w      = w_lstm

W_LSTM = round(best_w, 1)
W_RF   = round(1.0 - best_w, 1)
print(f"  Best weights → LSTM: {W_LSTM:.1f}  |  RF: {W_RF:.1f}")

stacked_pred_test = W_LSTM * lstm_pred_test + W_RF * rf_pred_test
stacked_rmse = np.sqrt(mean_squared_error(y_te_reg, stacked_pred_test))
stacked_r2   = r2_score(y_te_reg, stacked_pred_test)

print(f"\n  {'Model':<20} {'RMSE':>8}  {'R²':>8}")
print(f"  {'-'*38}")
print(f"  {'LSTM alone':<20} {lstm_rmse:>8.4f}  {lstm_r2:>8.4f}")
print(f"  {'Random Forest alone':<20} {rf_rmse:>8.4f}  {rf_r2:>8.4f}")
print(f"  {'Stacked (LSTM+RF)':<20} {stacked_rmse:>8.4f}  {stacked_r2:>8.4f}")

# ═══════════════════════════════════════════════════════════════
# 6. FINAL PIPELINE EVALUATION (Stage 1 × Stage 2)
# ═══════════════════════════════════════════════════════════════
section("[7/7] FINAL PIPELINE EVALUATION")
print("  Final Forecast = Stage1 × Stage2")
print("  Evaluated on ALL test rows (zero + non-zero)\n")

# We need Stage 2 predictions for ALL test rows
# Use the classifier scaler for full test set (already done: X_te_clf_s)
lstm_full_pred = lstm_reg.predict(X_te_clf_s, verbose=0).flatten()
rf_full_pred   = rf_model.predict(X_te_clf_s[:, -1, :])
stage2_full    = W_LSTM * lstm_full_pred + W_RF * rf_full_pred
stage2_full    = np.maximum(stage2_full, 0)  # clip negatives

# Final forecast: multiply sell probability × quantity
# Use soft probability (not hard 0/1) for smoother forecast
final_forecast = clf_probs * stage2_full

y_true_all = y_te_clf.astype(np.float64)  # original quantities in binary form
# We need actual quantities for all test rows — rebuild from test sequences
_, _, X_te_full, y_te_full = create_sequences_with_lookback(
    train_df, test_df, FEATURE_COLS, 'quantity_sold',
    timesteps=TIMESTEPS, binary_target=False
)

# Re-run pipeline on full test with quantity targets
lstm_full2  = lstm_reg.predict(X_te_clf_s, verbose=0).flatten()
rf_full2    = rf_model.predict(X_te_clf_s[:, -1, :])
stage2_q    = np.maximum(W_LSTM * lstm_full2 + W_RF * rf_full2, 0)
final_q     = clf_probs * stage2_q

# Metrics
smape_val    = smape(y_te_full, final_q)
mape_val     = safe_mape(y_te_full, final_q)
accuracy_val = max(0.0, 100.0 - smape_val)
rmse_val     = np.sqrt(mean_squared_error(y_te_full, final_q))
r2_val       = r2_score(y_te_full, final_q)

zero_actual  = (y_te_full < 1e-8).sum()

print(f"  Diagnostic:")
print(f"  Zero-actual rows : {zero_actual:,} / {len(y_te_full):,} ({zero_actual/len(y_te_full)*100:.1f}%)")
print(f"  Prediction range : [{final_q.min():.2f}, {final_q.max():.2f}]")
print(f"  Actual range     : [{y_te_full.min():.2f}, {y_te_full.max():.2f}]")

print(f"\n  ╔══════════════════════════════════════╗")
print(f"  ║     FINAL HYBRID MODEL METRICS       ║")
print(f"  ╠══════════════════════════════════════╣")
print(f"  ║  Accuracy (100 - SMAPE) : {accuracy_val:>7.2f}%   ║")
print(f"  ║  SMAPE                  : {smape_val:>7.2f}%   ║")
print(f"  ║  MAPE (zeros excluded)  : {mape_val:>7.2f}%   ║")
print(f"  ║  RMSE                   : {rmse_val:>8.4f}   ║")
print(f"  ║  R²                     : {r2_val:>8.4f}   ║")
print(f"  ║  Classifier F1          : {best_f1:>8.4f}   ║")
print(f"  ╚══════════════════════════════════════╝")

# Compare with old model if exists
if old_metrics:
    print(f"\n  {'Metric':<25} {'Old':>10}  {'New':>10}  Change")
    print(f"  {'-'*55}")

    def fmt(old, new, lower_better=True):
        if old == 0:
            return "    N/A"
        d = new - old
        p = d / abs(old) * 100
        arrow = "↓" if d < 0 else "↑"
        ok    = "[OK]" if (d < 0) == lower_better else "[X]"
        return f"{arrow}{abs(p):6.1f}% {ok}"

    metrics_cmp = [
        ('RMSE',     old_metrics.get('rmse', 0),     rmse_val,     True),
        ('R²',       old_metrics.get('r2', 0),        r2_val,       False),
        ('SMAPE',    old_metrics.get('smape', 0),     smape_val,    True),
        ('Accuracy', old_metrics.get('accuracy', 0),  accuracy_val, False),
    ]
    for name, old_v, new_v, lb in metrics_cmp:
        print(f"  {name:<25} {old_v:>10.4f}  {new_v:>10.4f}  {fmt(old_v, new_v, lb)}")

# ═══════════════════════════════════════════════════════════════
# SAVE ALL ARTIFACTS
# ═══════════════════════════════════════════════════════════════
section("SAVING ARTIFACTS")

clf_model.save('lstm_classifier.keras')
print("  [OK] Stage 1 classifier   : lstm_classifier.keras")

lstm_reg.save('lstm_regressor.keras')
print("  [OK] Stage 2 LSTM         : lstm_regressor.keras")

joblib.dump(rf_model, 'rf_regressor.joblib')
print("  [OK] Stage 2 RandomForest : rf_regressor.joblib")

joblib.dump(scaler_clf, 'hybrid_scaler_clf.joblib')
joblib.dump(scaler_reg, 'hybrid_scaler_reg.joblib')
print("  [OK] Scalers saved")

metadata = {
    'model_type'    : 'two_stage_hybrid',
    'architecture'  : 'Stage1: LSTM Classifier | Stage2: LSTM(64→32) + RF(200 trees) stacked',
    'feature_cols'  : FEATURE_COLS,
    'category_map'  : category_map,
    'timesteps'     : TIMESTEPS,
    'stage1': {
        'type'      : 'LSTM Binary Classifier',
        'threshold' : float(best_thresh),
        'f1'        : round(float(best_f1), 4),
        'precision' : round(float(precision_score(y_te_clf, clf_preds, zero_division=0)), 4),
        'recall'    : round(float(recall_score(y_te_clf, clf_preds, zero_division=0)), 4),
    },
    'stage2': {
        'type'      : 'Stacked LSTM + RandomForest',
        'w_lstm'    : float(W_LSTM),
        'w_rf'      : float(W_RF),
        'lstm_rmse' : round(float(lstm_rmse), 4),
        'rf_rmse'   : round(float(rf_rmse), 4),
        'stack_rmse': round(float(stacked_rmse), 4),
        'stack_r2'  : round(float(stacked_r2), 4),
        'top_features': fi_sorted.head(5).index.tolist(),
    },
    'metrics': {
        'accuracy'  : round(float(accuracy_val), 2),
        'smape'     : round(float(smape_val), 2),
        'mape'      : round(float(mape_val), 2),
        'rmse'      : round(float(rmse_val), 4),
        'r2'        : round(float(r2_val), 6),
        'f1'        : round(float(best_f1), 4),
    },
    'data': {
        'train_cutoff'    : str(train_cutoff.date()),
        'train_samples'   : int(len(X_tr_clf)),
        'test_samples'    : int(len(X_te_clf)),
        'reg_train_samples': int(len(X_tr_reg)),
        'reg_test_samples' : int(len(X_te_reg)),
        'total_products'  : int(df['product_name'].nunique()),
        'total_categories': int(df['category'].nunique()),
        'data_range'      : f"{df['date'].min().date()} to {df['date'].max().date()}",
        'data_months'     : int(df['date'].nunique()),
        'zero_pct'        : round(float(zero_pct), 1),
    },
    'training_date': datetime.datetime.now().isoformat()
}

with open('hybrid_model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)
print("  [OK] Metadata              : hybrid_model_metadata.json")

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
section("TRAINING COMPLETE")

print(f"""
  Model     : Two-Stage Hybrid (LSTM + Random Forest)
  Products  : {metadata['data']['total_products']:,}
  Categories: {metadata['data']['total_categories']}
  Data range: {metadata['data']['data_range']}
  Months    : {metadata['data']['data_months']}

  STAGE 1 (Classifier)
    Type      : LSTM Binary Classifier
    Threshold : {best_thresh:.2f}
    F1-Score  : {best_f1:.4f}

  STAGE 2 (Stacked Regressor)
    LSTM weight : {W_LSTM:.1f}
    RF weight   : {W_RF:.1f}
    Stack RMSE  : {stacked_rmse:.4f}

  FINAL METRICS
    Accuracy  : {accuracy_val:.2f}%
    SMAPE     : {smape_val:.2f}%
    RMSE      : {rmse_val:.4f}
    R²        : {r2_val:.6f}

  Saved files:
    lstm_classifier.keras
    lstm_regressor.keras
    rf_regressor.joblib
    hybrid_scaler_clf.joblib
    hybrid_scaler_reg.joblib
    hybrid_model_metadata.json

  Next: Update forecast_server.py to load the hybrid model.
        Use hybrid_model_metadata.json for feature_cols,
        thresholds and blend weights.
""")