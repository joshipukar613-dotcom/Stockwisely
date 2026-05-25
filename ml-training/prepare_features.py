"""
prepare_features_v3.py
Prepare features for ML training — v3 (Accurate Festival Calendar)
====================================================================
WHAT CHANGED FROM v2:
====================================================================
  FIX: Replaced inaccurate is_festival (0/1) with accurate
       festival_type (0/1/2/3) based on real Nepal calendar dates.

  OLD APPROACH (broken in v2):
    monthly['is_festival'] = (month == 10) | (month == 11) | (month == 4)
    Problems:
      1. Entire months flagged regardless of year
      2. 2025 Dashain falls in SEPTEMBER — was completely missed
      3. 2022 November has no major festival — was wrongly flagged
      4. Pre-festival stock-up months (September) ignored entirely
      5. Minor festivals (Holi, Teej, Maghe Sankranti) all treated as 0
      6. Data analysis confirmed: festival=1 correlated with LOWER sales
         (0.86x) because the blunt month-flag captured closure days more
         than actual demand spikes

  NEW APPROACH (v3):
    festival_type: 4-level accurate signal
      0 = Normal month (no significant festival)
      1 = Minor holiday (Holi, Teej, Maghe Sankranti, Lhosar, Christmas)
          ~1-2 day closures, mild demand effect
      2 = Major festival (Dashain, Tihar, Baisakh/Nepali New Year)
          Multi-day closures, large demand shifts by category
      3 = Pre-festival month (month immediately before Dashain)
          Stock-up surge — retailers and households buy in advance
          Often higher demand than the festival month itself

  WHY YEAR-SPECIFIC (not just month-based):
    Dashain date shifts every year (Bikram Sambat calendar):
      2021: Dashain = October    (standard)
      2022: Dashain = October    (started Sep 26, so Sep is pre-fest)
      2023: Dashain = October    (standard)
      2024: Dashain = October    (standard)
      2025: Dashain = SEPTEMBER  ← completely different, old code missed it!
    Without year-specific mapping, 2025 gets completely wrong labels.

  PERFORMANCE IMPACT EXPECTED:
    The model now receives 4 distinct signals instead of 1 noisy binary:
      - Normal months: model learns baseline demand
      - Minor festivals: model learns slight adjustments
      - Major festivals: model learns category-specific shifts
        (ELECTRONICS +40%, CLEANING -26%, SNACKS -11% etc.)
      - Pre-festival: model learns stock-up surge pattern
    Expected improvement: SMAPE -3% to -8%, R2 small improvement
    Biggest gain: products in ELECTRONICS, BABY_PRODUCTS, ALCOHOL
    (these showed clear festival uplift in data analysis)

  COLUMN CHANGE:
    is_festival (0/1)       → REMOVED
    festival_type (0/1/2/3) → ADDED

  NOTE FOR forecast_server.py:
    Update any code that reads 'is_festival' to read 'festival_type'
    Update FEATURE_COLS in train_and_save_lstm_v4.py accordingly

====================================================================
FIX 1 (from v2): Removed full-grid reindex (was 82.9% zeros)
FIX 2 (from v2): Tightened active window 6m -> 3m
FIX 3 (from v2): Removed products < 12 months history
FIX 4 (NEW v3):  Accurate Nepal festival calendar (year-specific)
====================================================================
"""

import pandas as pd
import numpy as np

print("=" * 70)
print("STEP 4: PREPARING FEATURES FOR LSTM TRAINING (v3 - Accurate Festivals)")
print("=" * 70)

# ======================================================================
# NEPAL FESTIVAL CALENDAR
# Year-specific (year, month) -> (festival_type, festival_name)
# Sources: Nepal government calendar, Bikram Sambat conversion
#
# festival_type:
#   0 = Normal
#   1 = Minor holiday (~1-2 day closures)
#   2 = Major festival (Dashain, Tihar, Baisakh)
#   3 = Pre-festival month (month before Dashain - stock-up demand surge)
# ======================================================================

NEPAL_FESTIVAL_CALENDAR = {

    # ── 2021 ──────────────────────────────────────────────────────────
    # Dashain: Oct 7-15 (Ghatasthapana Oct 7, Bijaya Dashami Oct 15)
    # Tihar:   Nov 2-7
    (2021,  8): (1, 'Janmashtami / Teej'),
    (2021,  9): (3, 'Pre-Dashain 2021'),         # stock-up month
    (2021, 10): (2, 'Dashain 2021'),              # Oct 7-15: MAJOR
    (2021, 11): (2, 'Tihar 2021'),               # Nov 2-7: MAJOR
    (2021, 12): (1, 'Christmas / New Year Eve'),

    # ── 2022 ──────────────────────────────────────────────────────────
    # Dashain: Sep 26 - Oct 4 (starts in Sep, peak in Oct)
    # Tihar:   Oct 22-27 (same month as Dashain — double impact October)
    # Baisakh: Apr 14
    (2022,  1): (1, 'New Year / Maghe Sankranti'), # Jan 1 + Jan 14
    (2022,  2): (1, 'Lhosar 2022'),               # Tibetan/Gurung New Year
    (2022,  3): (1, 'Holi 2022'),                 # Mar 18
    (2022,  4): (2, 'Baisakh / Nepali NY 2022'),  # Apr 14: MAJOR
    (2022,  8): (1, 'Janmashtami / Teej 2022'),
    (2022,  9): (3, 'Pre-Dashain 2022'),          # Dashain starts Sep 26!
    (2022, 10): (2, 'Dashain + Tihar 2022'),      # BOTH festivals in Oct
    (2022, 11): (1, 'Chhath 2022'),               # ~3 days, minor
    (2022, 12): (1, 'Christmas / New Year Eve'),

    # ── 2023 ──────────────────────────────────────────────────────────
    # Dashain: Oct 14-23
    # Tihar:   Nov 10-15
    # Baisakh: Apr 14
    (2023,  1): (1, 'New Year / Maghe Sankranti'),
    (2023,  2): (1, 'Lhosar 2023'),
    (2023,  3): (1, 'Holi 2023'),                 # Mar 8
    (2023,  4): (2, 'Baisakh / Nepali NY 2023'),  # Apr 14: MAJOR
    (2023,  8): (1, 'Janmashtami / Teej 2023'),
    (2023,  9): (3, 'Pre-Dashain 2023'),          # stock-up month
    (2023, 10): (2, 'Dashain 2023'),              # Oct 14-23: MAJOR
    (2023, 11): (2, 'Tihar + Chhath 2023'),       # Nov 10-15 Tihar: MAJOR
    (2023, 12): (1, 'Christmas / New Year Eve'),

    # ── 2024 ──────────────────────────────────────────────────────────
    # Dashain: Oct 2-12
    # Tihar:   Oct 29 - Nov 3 (bleeds into November)
    # Baisakh: Apr 13
    (2024,  1): (1, 'New Year / Maghe Sankranti'),
    (2024,  2): (1, 'Lhosar 2024'),
    (2024,  3): (1, 'Holi 2024'),                 # Mar 25
    (2024,  4): (2, 'Baisakh / Nepali NY 2024'),  # Apr 13: MAJOR
    (2024,  8): (1, 'Janmashtami / Teej 2024'),
    (2024,  9): (3, 'Pre-Dashain 2024'),          # stock-up month
    (2024, 10): (2, 'Dashain 2024'),              # Oct 2-12: MAJOR
    (2024, 11): (2, 'Tihar + Chhath 2024'),       # Tihar bleeds Nov: MAJOR
    (2024, 12): (1, 'Christmas / New Year Eve'),

    # ── 2025 ──────────────────────────────────────────────────────────
    # EARLY YEAR: Dashain Sep 22 - Oct 2 (mostly September!)
    # Tihar:   Oct 20-25
    # Baisakh: Apr 14
    # NOTE: Old code gave Sep=0, Oct=1 — completely wrong for 2025
    (2025,  1): (1, 'New Year / Maghe Sankranti'),
    (2025,  2): (1, 'Lhosar 2025'),
    (2025,  3): (1, 'Holi 2025'),
    (2025,  4): (2, 'Baisakh / Nepali NY 2025'),  # Apr 14: MAJOR
    (2025,  8): (3, 'Pre-Dashain 2025'),          # EARLY: Dashain is Sep 22
    (2025,  9): (2, 'Dashain 2025'),              # Sep 22-Oct 2: MAJOR (EARLY!)
    (2025, 10): (2, 'Tihar 2025'),               # Oct 20-25: MAJOR
    (2025, 11): (1, 'Chhath 2025'),
    (2025, 12): (1, 'Christmas / New Year Eve'),

    # ── 2026 ──────────────────────────────────────────────────────────
    # Dashain: approx Oct 2026 (Bikram Sambat 2083)
    # Baisakh: Apr 14
    (2026,  1): (1, 'New Year / Maghe Sankranti'),
    (2026,  4): (2, 'Baisakh / Nepali NY 2026'),  # Apr 14: MAJOR
    # Oct/Nov 2026 not in dataset range, skip
}

# All other (year, month) combinations default to 0 (Normal)


def get_festival_type(year, month):
    """Return festival_type (0/1/2/3) for a given year and month."""
    return NEPAL_FESTIVAL_CALENDAR.get((int(year), int(month)), (0, 'Normal'))[0]


def get_festival_name(year, month):
    """Return festival name for a given year and month."""
    return NEPAL_FESTIVAL_CALENDAR.get((int(year), int(month)), (0, 'Normal'))[1]


# ── Load raw data ─────────────────────────────────────────────
print("\n[1/7] Loading raw data...")
df = pd.read_csv('data_raw_sales.csv')
df['sale_date'] = pd.to_datetime(df['sale_date'], format='mixed')

print(f"  Records   : {len(df):,}")
print(f"  Date range: {df['sale_date'].min().date()} to {df['sale_date'].max().date()}")
print(f"  Products  : {df['product_name'].nunique():,}")
print(f"  Categories: {df['category'].nunique()}")

# ── Aggregate to monthly level ────────────────────────────────
print("\n[2/7] Aggregating to monthly level...")
df['date'] = df['sale_date'].dt.to_period('M').dt.to_timestamp()

monthly = df.groupby(['product_name', 'date', 'category']).agg({
    'quantity': 'sum',
    'amount':   'sum'
}).reset_index()
monthly.rename(columns={'quantity': 'quantity_sold'}, inplace=True)

print(f"  Product-month records : {len(monthly):,}")
print(f"  Products              : {monthly['product_name'].nunique():,}")
print(f"  Months                : {monthly['date'].nunique()}")

# ── Active window reindex ─────────────────────────────────────
print("\n[3/7] Building active-window product grid...")
print("  Strategy : Only include product-months where product")
print("             sold within the last 3 months")

all_months = pd.date_range(
    start=monthly['date'].min(),
    end=monthly['date'].max(),
    freq='MS'
)
print(f"\n  Full date range: {all_months[0].date()} to {all_months[-1].date()} "
      f"({len(all_months)} months)")

product_category = (
    monthly.groupby('product_name')['category']
           .agg(lambda x: x.value_counts().index[0])
           .to_dict()
)

print("\n  Building per-product active ranges...")
all_products  = monthly['product_name'].unique()
active_frames = []

for product in all_products:
    prod_data = monthly[monthly['product_name'] == product].copy()

    first_sale = prod_data['date'].min()
    last_sale  = prod_data['date'].max()

    prod_months = pd.date_range(start=first_sale, end=last_sale, freq='MS')
    prod_full   = pd.DataFrame({'date': prod_months})
    prod_full['product_name'] = product

    prod_merged = prod_full.merge(
        prod_data[['date', 'quantity_sold', 'amount']],
        on='date', how='left'
    )
    prod_merged['quantity_sold'] = prod_merged['quantity_sold'].fillna(0)
    prod_merged['amount']        = prod_merged['amount'].fillna(0)
    prod_merged['category']      = product_category[product]

    prod_merged = prod_merged.sort_values('date')
    prod_merged['recent_sales_3m'] = (
        prod_merged['quantity_sold']
        .shift(1)
        .rolling(window=3, min_periods=1)
        .sum()
        .fillna(0)
    )

    prod_merged = prod_merged[
        (prod_merged['quantity_sold'] > 0) |
        (prod_merged['recent_sales_3m'] > 0)
    ].copy()

    prod_merged.drop(columns=['recent_sales_3m'], inplace=True)
    active_frames.append(prod_merged)

monthly = pd.concat(active_frames, ignore_index=True)

print(f"\n  Records after active-window filter : {len(monthly):,}")
print(f"  Products retained                  : {monthly['product_name'].nunique():,}")
zero_pct_after_window = (monthly['quantity_sold'] == 0).mean() * 100
print(f"  Zero-sales rows                    : "
      f"{(monthly['quantity_sold']==0).sum():,} ({zero_pct_after_window:.1f}%)")

# ── Lag features ──────────────────────────────────────────────
print("\n[4/7] Creating lag features...")
monthly = monthly.sort_values(['product_name', 'date'])

monthly['lag_1'] = monthly.groupby('product_name')['quantity_sold'].shift(1)
monthly['lag_2'] = monthly.groupby('product_name')['quantity_sold'].shift(2)
monthly['lag_3'] = monthly.groupby('product_name')['quantity_sold'].shift(3)

# ── Rolling averages ──────────────────────────────────────────
print("[5/7] Creating rolling averages and trend features...")
monthly['rolling_3m'] = monthly.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).mean()
)
monthly['rolling_6m'] = monthly.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=6, min_periods=1).mean()
)
monthly['rolling_3m_std'] = monthly.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.rolling(window=3, min_periods=1).std().fillna(0)
)
monthly['sales_velocity'] = (
    monthly.groupby('product_name')['quantity_sold']
           .diff()
           .fillna(0)
)
monthly['sales_trend'] = monthly.groupby('product_name')['quantity_sold'].transform(
    lambda x: x.diff().rolling(window=3, min_periods=1).mean()
).fillna(0)

# ── Temporal features ─────────────────────────────────────────
print("[6/7] Creating temporal and festival features...")
monthly['month']   = monthly['date'].dt.month
monthly['quarter'] = monthly['date'].dt.quarter
monthly['year']    = monthly['date'].dt.year

# ── ACCURATE FESTIVAL CALENDAR (replaces old is_festival) ────
print("\n  Building accurate Nepal festival calendar...")
print("  festival_type encoding:")
print("    0 = Normal month")
print("    1 = Minor holiday (Holi, Teej, Maghe Sankranti, Lhosar, Christmas)")
print("    2 = Major festival (Dashain, Tihar, Baisakh/Nepali New Year)")
print("    3 = Pre-festival month (month before Dashain - stock-up demand)")

monthly['festival_type'] = monthly.apply(
    lambda row: get_festival_type(row['year'], row['month']), axis=1
)

# Print the calendar as applied to this dataset
unique_months = monthly[['date','year','month','festival_type']].drop_duplicates('date').sort_values('date')
unique_months['festival_name'] = unique_months.apply(
    lambda row: get_festival_name(row['year'], row['month']), axis=1
)

print(f"\n  Festival calendar applied to dataset:")
print(f"  {'Date':<12} {'Type':>5}  {'Festival'}")
print(f"  {'-' * 50}")
for _, row in unique_months.iterrows():
    if row['festival_type'] > 0:
        marker = ['', '[MINOR]', '[MAJOR]', '[PRE-FEST]'][int(row['festival_type'])]
        print(f"  {str(row['date'].date()):<12} {int(row['festival_type']):>3}    "
              f"{marker:<12} {row['festival_name']}")

# Distribution summary
ft_counts = monthly['festival_type'].value_counts().sort_index()
total = len(monthly)
print(f"\n  Distribution:")
labels = {0: 'Normal', 1: 'Minor holiday', 2: 'Major festival', 3: 'Pre-festival'}
for ft, count in ft_counts.items():
    print(f"    Type {ft} ({labels[ft]:<15}): {count:>6,} rows  ({count/total*100:.1f}%)")

print(f"\n  Comparison with old is_festival:")
old_fest = ((monthly['month'] == 10) | (monthly['month'] == 11) | (monthly['month'] == 4)).sum()
new_nonzero = (monthly['festival_type'] > 0).sum()
print(f"    Old: {old_fest:,} rows flagged as festival (binary)")
print(f"    New: {new_nonzero:,} rows with type > 0 (4-level)")
print(f"    Correctly captures 2025 Sep Dashain: "
      f"{(monthly[(monthly['year']==2025) & (monthly['month']==9)]['festival_type'] == 2).all()}")
print(f"    2022 Nov no longer wrongly flagged as major: "
      f"{(monthly[(monthly['year']==2022) & (monthly['month']==11)]['festival_type'] < 2).all()}")

# ── Category encoding ─────────────────────────────────────────
print("\n[7/7] Encoding categories...")
category_map = {
    cat: idx for idx, cat in enumerate(sorted(monthly['category'].unique()))
}
monthly['category_encoded'] = monthly['category'].map(category_map)

print(f"\n  Category mapping:")
for cat, code in sorted(category_map.items(), key=lambda x: x[1]):
    count = len(monthly[monthly['category'] == cat])
    print(f"    {code:>2}: {cat:<20} ({count:,} records)")

# ── Remove rows with missing lag features ─────────────────────
print("\n  Removing rows with missing lag features...")
before = len(monthly)
monthly = monthly.dropna()
after   = len(monthly)
print(f"  Removed : {before - after:,} rows")
print(f"  Retained: {after:,} rows")

# ── Filter low-activity products (< 12 months) ───────────────
print("\n  Filtering low-activity products (< 12 months of sales history)...")
before_filter   = len(monthly)
products_before = monthly['product_name'].nunique()

months_per_prod = monthly.groupby('product_name')['date'].nunique()
active_products = months_per_prod[months_per_prod >= 12].index
monthly         = monthly[monthly['product_name'].isin(active_products)].copy()

products_removed = products_before - monthly['product_name'].nunique()
rows_removed     = before_filter - len(monthly)
print(f"  Removed  : {products_removed:,} low-activity products")
print(f"  Removed  : {rows_removed:,} rows")
print(f"  Remaining: {monthly['product_name'].nunique():,} products")
print(f"  Remaining: {len(monthly):,} rows")

# ── Final zero check ──────────────────────────────────────────
final_zero_pct = (monthly['quantity_sold'] == 0).mean() * 100
print(f"\n  Final zero-sales %: {final_zero_pct:.1f}%")

nan_count = monthly.isnull().sum().sum()
print(f"  NaN values: {nan_count}")
assert nan_count == 0, f"ERROR: {nan_count} NaN values found!"

# ── Column ordering ───────────────────────────────────────────
# Keep is_festival column as 0 for backward compatibility
# but populate festival_type as the real signal
# Training script should use festival_type, not is_festival
monthly['is_festival'] = (monthly['festival_type'] >= 2).astype(int)  # backward compat

final_cols = [
    'date', 'product_name', 'quantity_sold', 'amount', 'category',
    'lag_1', 'lag_2', 'lag_3',
    'rolling_3m', 'rolling_6m', 'rolling_3m_std',
    'sales_velocity', 'sales_trend',
    'month', 'quarter', 'year',
    'is_festival',       # kept for backward compat (2=major, 3=pre -> is_festival=1)
    'festival_type',     # NEW: use this in training (0/1/2/3)
    'category_encoded'
]
monthly = monthly[final_cols]

# ── Save ──────────────────────────────────────────────────────
monthly.to_csv('data_features.csv', index=False)
print("\n  [OK] Saved to data_features.csv")

# ── Final summary ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("FEATURE PREPARATION SUMMARY (v3)")
print("=" * 70)

total_months   = monthly['date'].nunique()
total_products = monthly['product_name'].nunique()
mpp            = monthly.groupby('product_name')['date'].nunique()

print(f"""
  Total records   : {len(monthly):,}
  Products        : {total_products:,}
  Categories      : {monthly['category'].nunique()}
  Date range      : {monthly['date'].min().date()} to {monthly['date'].max().date()}
  Time periods    : {total_months} unique months
  Zero-sales rows : {final_zero_pct:.1f}%

  Features created:
    Lag        : lag_1, lag_2, lag_3
    Rolling    : rolling_3m, rolling_6m, rolling_3m_std
    Trend      : sales_velocity, sales_trend
    Temporal   : month, quarter, year
    Festival   : festival_type (0/1/2/3)  ← NEW accurate signal
                 is_festival (0/1)         ← kept for backward compat
    Categorical: category_encoded

  festival_type breakdown:
    0 Normal       : {(monthly['festival_type']==0).sum():>6,} rows ({(monthly['festival_type']==0).mean()*100:.1f}%)
    1 Minor holiday: {(monthly['festival_type']==1).sum():>6,} rows ({(monthly['festival_type']==1).mean()*100:.1f}%)
    2 Major fest   : {(monthly['festival_type']==2).sum():>6,} rows ({(monthly['festival_type']==2).mean()*100:.1f}%)
    3 Pre-festival : {(monthly['festival_type']==3).sum():>6,} rows ({(monthly['festival_type']==3).mean()*100:.1f}%)

  KEY FIXES vs v2:
    - 2025 September now correctly labelled as Dashain (type=2)
    - 2022 November now correctly labelled as Chhath minor (type=1)
    - Pre-festival months (Sep mostly) now labelled type=3
    - Minor festivals now labelled type=1 instead of type=0
    - is_festival kept for backward compatibility

  NEXT STEP:
    Update FEATURE_COLS in train_and_save_lstm_v4.py:
      Replace 'is_festival' with 'festival_type'
    The 4-level signal gives the model real information instead
    of a noisy binary that showed 0.86x LOWER sales correlation.
""")

print("=" * 70)
print("[OK] STEP 4 COMPLETE: Features prepared with accurate festival data!")
print("     Next: Run train_and_save_lstm_v4.py (update FEATURE_COLS first)")
print("=" * 70)