import argparse
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd


def read_db_url(from_env_file: Optional[Path]) -> Optional[str]:
    # Prefer environment variable
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    # Fallback to .env file
    if from_env_file and from_env_file.exists():
        for line in from_env_file.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    return None


def snake_case(name: str) -> str:
    cleaned = name.strip().lower().replace("%", "pct").replace("#", "num").replace("/", "_")
    cleaned = "".join(c if c.isalnum() or c == "_" or c == " " else "_" for c in cleaned)
    cleaned = "_".join(part for part in cleaned.replace(" ", "_").split("_") if part)
    return cleaned


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [snake_case(str(c)) for c in df.columns]
    # Trim strings
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str).str.strip()
    return df


def find_cleaned_files(cleaned_dir: Path) -> Dict[str, Path]:
    mapping = {}
    candidates = {
        "sales_records": ["sales_data_clean.csv", "*sales*clean*.csv"],
        "purchase_records": ["Purchase_data_clean.csv", "*purchase*clean*.csv"],
        "purchase_returns": ["purchase_return_clean.csv", "*return*clean*.csv"],
        "stock_movements": ["stock_data_clean.csv", "*stock*clean*.csv"],
        "model_training_history": ["ml_training_data_complete.csv", "*ml_training*complete*.csv"],
    }
    for table, patterns in candidates.items():
        for pat in patterns:
            for p in cleaned_dir.glob(pat):
                mapping[table] = p
                break
        # Keep first match per table
    return mapping


def select_and_cast_sales(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    # Map to DB columns for sales_records
    out = pd.DataFrame()
    # number_miti (date string like Nepali calendar), code, description, quantity, sales_rate, cp, amount, dis_pct, dis_amount, net_amt, num, num_1, source_file, extracted_month
    out["number_miti"] = df.get("number_miti")
    out["code"] = pd.to_numeric(df.get("code"), errors='coerce')
    out["description"] = df.get("description")
    # Quantity/Rate may have different original headers
    qty_series = df.get("qty") if "qty" in df.columns else df.get("quantity")
    rate_series = df.get("rate") if "rate" in df.columns else df.get("sales_rate")
    out["quantity"] = pd.to_numeric(qty_series, errors='coerce')
    out["sales_rate"] = pd.to_numeric(rate_series, errors='coerce')
    out["cp"] = pd.to_numeric(df.get("cp"), errors='coerce')
    out["amount"] = pd.to_numeric(df.get("amount"), errors='coerce')
    out["dis_pct"] = pd.to_numeric(df.get("dis_pct"), errors='coerce')
    out["dis_amount"] = pd.to_numeric(df.get("dis_amount"), errors='coerce')
    out["net_amt"] = pd.to_numeric(df.get("net_amt"), errors='coerce')
    out["num"] = df.get("num")
    out["num_1"] = pd.to_numeric(df.get("num_1"), errors='coerce')
    out["source_file"] = df.get("source_file")
    out["extracted_month"] = pd.to_numeric(df.get("extracted_month"), errors='coerce')
    # Clean strings
    for col in ["number_miti", "description", "source_file"]:
        out[col] = out[col].astype(str).str.strip()
    # Drop rows with missing critical numerics
    out = out.dropna(subset=["code", "quantity", "sales_rate", "amount"], how='any')
    return out


def select_and_cast_stock(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    col_map = {
        "product_code": "product_code",
        "description": "description",
        "vat_pct": "vat_pct",
        "inwards_qty": "inwards_qty",
        "inwards_amt": "inwards_amt",
        "outwards_qty": "outwards_qty",
        "outwards_amt": "outwards_amt",
        "balance_qty": "balance_qty",
        "balance_amt": "balance_amt",
        "last_cost": "last_cost",
        "source_file": "source_file",
        "extracted_month": "extracted_month",
    }
    out = pd.DataFrame()
    for src, dest in col_map.items():
        out[dest] = df.get(src)
    for col in ["vat_pct", "inwards_qty", "inwards_amt", "outwards_qty", "outwards_amt", "balance_qty", "balance_amt", "last_cost", "extracted_month"]:
        out[col] = pd.to_numeric(out[col], errors='coerce')
    for col in ["product_code", "description", "source_file"]:
        out[col] = out[col].astype(str).str.strip()
    return out


def select_and_cast_purchase(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    out = pd.DataFrame()
    out["number_miti"] = df.get("number_miti")
    out["ref_no"] = pd.to_numeric(df.get("ref_no"), errors='coerce')
    out["code"] = pd.to_numeric(df.get("code"), errors='coerce')
    out["description"] = df.get("description")
    qty_series = df.get("qty") if "qty" in df.columns else df.get("quantity")
    rate_series = df.get("rate") if "rate" in df.columns else df.get("purchase_rate")
    out["qty"] = pd.to_numeric(qty_series, errors='coerce')
    out["rate"] = pd.to_numeric(rate_series, errors='coerce')
    out["amount"] = pd.to_numeric(df.get("amount"), errors='coerce')
    out["source_file"] = df.get("source_file")
    out["extracted_month"] = pd.to_numeric(df.get("extracted_month"), errors='coerce')
    for col in ["number_miti", "description", "source_file"]:
        out[col] = out[col].astype(str).str.strip()
    out = out.dropna(subset=["code", "qty", "rate", "amount"], how='any')
    return out


def select_and_cast_return(df: pd.DataFrame) -> pd.DataFrame:
    # Returns share schema with purchase_returns table
    return select_and_cast_purchase(df)


def select_and_cast_training(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    # Keep core features
    keep = [
        "product_name","month","total_sales_qty","avg_sale_price","total_purchased_qty",
        "avg_stock_level","total_returned_qty","sales_lag_1","sales_lag_2","sales_lag_3",
        "sales_avg_3months","sales_trend","return_rate","stock_to_sales_ratio","season",
        "is_festival","category"
    ] + [c for c in df.columns if c.startswith("cat_")]
    out = df[keep].copy()
    numeric_cols = [
        "month","total_sales_qty","avg_sale_price","total_purchased_qty","avg_stock_level",
        "total_returned_qty","sales_lag_1","sales_lag_2","sales_lag_3","sales_avg_3months",
        "sales_trend","return_rate","stock_to_sales_ratio"
    ]
    for col in numeric_cols:
        out[col] = pd.to_numeric(out[col], errors='coerce')
    # Cast booleans from strings (True/False) to actual bool
    for c in [c for c in out.columns if c.startswith("cat_")]:
        out[c] = out[c].astype(str).str.lower().map({"true": True, "false": False}).fillna(False)
    out["is_festival"] = pd.to_numeric(out["is_festival"], errors='coerce').fillna(0).astype(int)
    for col in ["product_name","season","category"]:
        out[col] = out[col].astype(str).str.strip()
    return out


def prepare_dataframe_df(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    if table_name == "sales_records":
        return select_and_cast_sales(df)
    if table_name == "stock_movements":
        return select_and_cast_stock(df)
    if table_name == "purchase_records":
        return select_and_cast_purchase_features(df)
    if table_name == "purchase_returns":
        return select_and_cast_return(df)
    if table_name == "model_training_history":
        return select_and_cast_training(df)
    # Default: normalized
    return normalize_columns(df)


def _parse_year_from_miti(miti: Optional[pd.Series], length: int) -> pd.Series:
    if miti is None:
        return pd.Series([None] * length)
    s = miti.astype(str).str.split("/").str[0]
    return pd.to_numeric(s, errors='coerce')


def month_to_season(month: pd.Series) -> pd.Series:
    # Simple mapping by Gregorian month number; adjust later if needed
    m = pd.to_numeric(month, errors='coerce').fillna(0).astype(int)
    # 1-3 Winter, 4-6 Spring, 7-9 Summer, 10-12 Autumn
    return m.map({1: "Winter", 2: "Winter", 3: "Winter", 4: "Spring", 5: "Spring", 6: "Spring", 7: "Summer", 8: "Summer", 9: "Summer", 10: "Autumn", 11: "Autumn", 12: "Autumn"}).fillna("Unknown")


def aggregate_purchase_to_records(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    # Extract needed raw fields
    df["product_code"] = pd.to_numeric(df.get("code"), errors='coerce')
    df["product_name"] = df.get("description")
    # Month from extracted_month if available, else parse from number_miti
    if "extracted_month" in df.columns:
        df["month"] = pd.to_numeric(df.get("extracted_month"), errors='coerce')
    else:
        miti = df.get("number_miti")
        m = None if miti is None else miti.astype(str).str.split("/").str[1]
        df["month"] = pd.to_numeric(m, errors='coerce')
    df["fiscal_year"] = _parse_year_from_miti(df.get("number_miti"), len(df))
    qty_series = df.get("qty") if "qty" in df.columns else df.get("quantity")
    rate_series = df.get("rate") if "rate" in df.columns else df.get("purchase_rate")
    df["p_qty"] = pd.to_numeric(qty_series, errors='coerce')
    df["p_rate"] = pd.to_numeric(rate_series, errors='coerce')

    base = df[["product_code", "product_name", "fiscal_year", "month", "p_qty", "p_rate"]].dropna(subset=["product_code", "month", "p_qty"], how='any')
    # Group to monthly aggregates per product
    agg = base.groupby(["product_code", "product_name", "fiscal_year", "month"], as_index=False).agg(
        purchases_qty=("p_qty", "sum"),
        avg_rate=("p_rate", "mean")
    )

    # Compute lags and rolling windows per product_code
    agg = agg.sort_values(["product_code", "fiscal_year", "month"])  # naive order
    def add_ts_features(g: pd.DataFrame) -> pd.DataFrame:
        g = g.copy()
        g["purchases_lag_1"] = g["purchases_qty"].shift(1)
        g["purchases_lag_2"] = g["purchases_qty"].shift(2)
        g["purchases_lag_3"] = g["purchases_qty"].shift(3)
        g["purchases_roll_3m"] = g["purchases_qty"].rolling(3, min_periods=1).sum()
        g["purchases_roll_6m"] = g["purchases_qty"].rolling(6, min_periods=1).sum()
        g["purchases_trend"] = g["purchases_qty"].diff()
        return g
    agg = agg.groupby("product_code", as_index=False, group_keys=False).apply(add_ts_features)
    # Ensure TS feature columns exist even if single-row groups
    for col in [
        "purchases_lag_1",
        "purchases_lag_2",
        "purchases_lag_3",
        "purchases_roll_3m",
        "purchases_roll_6m",
        "purchases_trend",
    ]:
        if col not in agg.columns:
            agg[col] = None

    # Add categorical fields and festival flags (basic placeholders)
    agg["season"] = month_to_season(agg["month"])
    agg["category"] = "Unknown"
    agg["is_dashain"] = 0
    agg["is_tihar"] = 0
    agg["is_holi"] = 0
    agg["is_festival"] = 0

    # Category averages (placeholder: overall average across all Unknown category)
    overall_avg = agg["purchases_qty"].mean()
    agg["category_avg_purchases"] = overall_avg

    # Final column order matches purchase_records table
    cols = [
        "product_code",
        "product_name",
        "category",
        "fiscal_year",
        "month",
        "season",
        "purchases_qty",
        "avg_rate",
        "purchases_lag_1",
        "purchases_lag_2",
        "purchases_lag_3",
        "purchases_roll_3m",
        "purchases_roll_6m",
        "purchases_trend",
        "is_dashain",
        "is_tihar",
        "is_holi",
        "is_festival",
        "category_avg_purchases",
    ]
    return agg[cols]


def select_and_cast_purchase_features(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df)
    keep = [
        "product_code","product_name","category","fiscal_year","month","season",
        "purchases_qty","avg_rate","purchases_lag_1","purchases_lag_2","purchases_lag_3",
        "purchases_roll_3m","purchases_roll_6m","purchases_trend","is_dashain","is_tihar",
        "is_holi","is_festival","category_avg_purchases"
    ]
    # If file already exactly matches, this will pass through
    out = df[[c for c in keep if c in df.columns]].copy()
    # Cast numerics
    num_cols = [
        "product_code","fiscal_year","month","purchases_qty","avg_rate","purchases_lag_1","purchases_lag_2",
        "purchases_lag_3","purchases_roll_3m","purchases_roll_6m","purchases_trend","category_avg_purchases"
    ]
    for c in num_cols:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors='coerce')
    # Flags as integers
    for c in ["is_dashain","is_tihar","is_holi","is_festival"]:
        if c in out.columns:
            out[c] = pd.to_numeric(out[c], errors='coerce').fillna(0).astype(int)
    for c in ["product_name","category","season"]:
        if c in out.columns:
            out[c] = out[c].astype(str).str.strip()
    return out


def import_csv_to_table(csv_path: Path, table_name: str, db_url: str, mode: str = 'append', chunksize: int = 1000) -> int:
    from sqlalchemy import create_engine
    engine = create_engine(db_url)
    total_rows = 0
    reader = pd.read_csv(csv_path, low_memory=False, chunksize=chunksize)
    first_chunk = True
    for chunk in reader:
        df = prepare_dataframe_df(chunk, table_name)
        df = df.where(pd.notnull(df), None)
        df.to_sql(table_name, con=engine, if_exists=('replace' if mode == 'replace' and first_chunk else 'append'), index=False)
        first_chunk = False
        total_rows += len(df)
    engine.dispose()
    return total_rows


def main():
    parser = argparse.ArgumentParser(description="Import cleaned CSVs into PostgreSQL tables.")
    parser.add_argument("--cleaned-dir", required=True, help="Path to the cleaned_data folder.")
    parser.add_argument("--db-url", help="PostgreSQL connection URL (e.g., postgresql+psycopg2://user:pass@host:port/db)")
    parser.add_argument("--env-file", default=str(Path("backend/.env")), help="Path to .env file containing DATABASE_URL.")
    parser.add_argument("--overwrite", action="store_true", help="Drop and recreate target tables before import.")
    args = parser.parse_args()

    cleaned_dir = Path(args.cleaned_dir)
    if not cleaned_dir.exists():
        raise SystemExit(f"Cleaned directory not found: {cleaned_dir}")

    db_url = args.db_url or read_db_url(Path(args.env_file))
    if not db_url:
        raise SystemExit("DATABASE_URL not provided. Pass --db-url or ensure backend/.env contains it.")

    files = find_cleaned_files(cleaned_dir)
    if not files:
        raise SystemExit("No cleaned files found to import.")

    # Determine import mode
    mode = 'replace' if args.overwrite else 'append'

    # Import each file
    report_lines: List[str] = []
    report_lines.append("Data Import Report")
    report_lines.append("===================\n")
    for table, path in files.items():
        try:
            rows = import_csv_to_table(path, table, db_url, mode=mode)
            report_lines.append(f"Imported {rows} rows into table {table} from {path.name}")
        except Exception as e:
            report_lines.append(f"FAILED to import {path.name} into {table}: {e}")

    report_path = cleaned_dir / "import_report.txt"
    report_path.write_text("\n".join(report_lines), encoding='utf-8')
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    pd.options.mode.use_inf_as_na = True
    main()
