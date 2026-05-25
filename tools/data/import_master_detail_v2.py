import argparse
import os
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values


DEF_ENV = Path("backend/.env")


def read_db_url(db_url_cli: str | None, env_path: Path = DEF_ENV) -> str:
    if db_url_cli:
        return db_url_cli
    v = os.getenv("DATABASE_URL")
    if v:
        return v
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("DATABASE_URL not found. Provide --db-url or set backend/.env")


def normalize_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    mapping = {
        "NUMBER / MITI": "number_miti",
        "NUMBER/ MITI": "number_miti",
        "NUMBER/MITI": "number_miti",
        "NUMBER": "number_miti",
        "MITI": "number_miti",
        "CODE": "code",
        "DESCRIPTION": "description",
        "QUANTITY": "quantity",
        "QTY": "quantity",
        "SALES RATE": "sales_rate",
        "RATE": "sales_rate",
        "CP": "cp",
        "AMOUNT": "amount",
        "DIS %": "dis_pct",
        "DIS AMOUNT": "dis_amount",
        "NET AMT": "net_amt",
        "extracted_month": "extracted_month",
        "source_file": "source_file",
        "REF NO": "ref_no",
        "PURCHASE RATE": "purchase_rate",
    }
    df.columns = [mapping.get(str(c).strip(), str(c).strip().lower().replace(" ", "_")) for c in df.columns]
    for c in df.select_dtypes(include=["object"]).columns:
        df[c] = df[c].astype(str).str.strip()
    return df


def categorize_product(name: str) -> str:
    n = (name or "").lower()
    rules = {
        "BAKERY": ["bread", "cake", "biscuit", "cookie", "donut", "pastry"],
        "BEVERAGES": ["juice", "drink", "tea", "coffee", "soda", "cola", "water"],
        "SNACKS": ["chips", "kurkure", "namkeen", "popcorn", "snack", "noodle"],
        "DAIRY": ["milk", "cheese", "butter", "yogurt", "curd", "paneer"],
        "PERSONAL CARE": ["soap", "shampoo", "toothpaste", "cream", "lotion"],
        "HOUSEHOLD": ["detergent", "cleaner", "mop", "bucket", "foil", "wrap"],
        "CONFECTIONERY": ["chocolate", "candy", "toffee", "bar"],
        "SPICES": ["masala", "spice", "turmeric", "cumin", "chilli", "pepper"],
        "GROCERY": ["rice", "flour", "atta", "maida", "suji", "lentil", "dal", "salt", "sugar", "oil"],
    }
    for cat, kws in rules.items():
        if any(k in n for k in kws):
            return cat
    return "OTHER"


def connect(db_url: str):
    return psycopg2.connect(db_url)


def ensure_products(conn, sales_df: pd.DataFrame, batch_size: int = 1000) -> Dict[str, int]:
    df = normalize_cols(sales_df)
    df = df[["description"]].copy()
    df["description"] = df["description"].astype(str).str.strip()
    df = df[df["description"] != ""]
    df["category"] = df["description"].map(categorize_product)
    df = df.drop_duplicates(subset=["description"]).reset_index(drop=True)

    with conn.cursor() as cur:
        cur.execute("SELECT product_id, product_name FROM public.products")
        existing = {name: pid for (pid, name) in cur.fetchall()}
        to_insert = [(r.description, r.category) for r in df.itertuples(index=False) if r.description not in existing]
        if to_insert:
            for i in range(0, len(to_insert), batch_size):
                execute_values(cur,
                               "INSERT INTO public.products(product_name, category) VALUES %s",
                               to_insert[i:i+batch_size],
                               page_size=batch_size)
            conn.commit()
        cur.execute("SELECT product_id, product_name FROM public.products")
        mapping = {name: pid for (pid, name) in cur.fetchall()}
    return mapping


def parse_sale_date(row, nepali_year_default: int) -> pd.Timestamp:
    m = pd.to_numeric(row.get("extracted_month"), errors="coerce")
    mm = int(m) if pd.notnull(m) and 1 <= int(m) <= 12 else 1
    return pd.Timestamp(year=int(nepali_year_default), month=mm, day=15)


def import_sales(conn, sales_df: pd.DataFrame, nepali_year_default: int = 2081, batch_size: int = 1000, commit_every: int = 10000, progress_every: int = 5000) -> Tuple[int, int]:
    df = normalize_cols(sales_df)
    cols = ["number_miti","description","quantity","sales_rate","cp","amount","net_amt","extracted_month"]
    for c in cols:
        if c not in df.columns:
            df[c] = None
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["sales_rate"] = pd.to_numeric(df["sales_rate"], errors="coerce").fillna(0)
    df["cp"] = pd.to_numeric(df["cp"], errors="coerce").fillna(0)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["net_amt"] = pd.to_numeric(df["net_amt"], errors="coerce")
    df = df[df["quantity"] > 0]

    df["invoice_number_raw"] = df["number_miti"].fillna("")
    df["invoice_number"] = df["invoice_number_raw"].apply(lambda s: s if s else f"S-AUTO-{pd.Timestamp.now().value}")

    masters = df[["invoice_number", "extracted_month", "number_miti"]].drop_duplicates()
    masters = masters.assign(sale_date=lambda x: x.apply(lambda r: parse_sale_date(r, nepali_year_default), axis=1))
    masters = masters.assign(nepali_year=int(nepali_year_default))
    masters = masters.assign(nepali_month=lambda x: pd.to_numeric(x["extracted_month"], errors="coerce").fillna(1).astype(int))
    totals = df.groupby("invoice_number").apply(lambda g: pd.to_numeric(g.get("net_amt"), errors="coerce").fillna(pd.to_numeric(g.get("amount"), errors="coerce"))).sum()
    masters = masters.assign(total_amount=lambda x: x["invoice_number"].map(totals).fillna(0.0))

    master_rows = [(row.invoice_number, row.sale_date.to_pydatetime(), int(row.nepali_month), int(row.nepali_year), float(row.total_amount)) for row in masters.itertuples(index=False)]
    with conn.cursor() as cur:
        for i in range(0, len(master_rows), batch_size):
            execute_values(cur,
                           "INSERT INTO public.sales_master(invoice_number, sale_date, nepali_month, nepali_year, total_amount) VALUES %s ON CONFLICT (invoice_number) DO NOTHING",
                           master_rows[i:i+batch_size],
                           page_size=batch_size)
        conn.commit()
        cur.execute("SELECT sale_id, invoice_number FROM public.sales_master")
        mapping = {inv: sid for sid, inv in cur.fetchall()}

    items: List[Tuple] = []
    processed = 0
    last_commit = 0
    for r in df.itertuples(index=False):
        inv = getattr(r, "invoice_number")
        sid = mapping.get(inv)
        if not sid:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.sales_master(invoice_number, sale_date, nepali_month, nepali_year, total_amount) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (invoice_number) DO UPDATE SET sale_date = EXCLUDED.sale_date RETURNING sale_id",
                    (inv, parse_sale_date(r, nepali_year_default).to_pydatetime(), int(getattr(r, "extracted_month") or 1), int(nepali_year_default), float(getattr(r, "net_amt") or getattr(r, "amount") or 0.0)),
                )
                sid = cur.fetchone()[0]
                mapping[inv] = sid
        name = str(getattr(r, "description") or "").strip()
        if not name:
            continue
        qty = float(getattr(r, "quantity") or 0)
        unit_price = float(getattr(r, "sales_rate") or 0)
        cp = float(getattr(r, "cp") or 0)
        amt = float(getattr(r, "amount") or 0)
        items.append((sid, name, qty, unit_price, cp, amt))
        processed += 1

        if len(items) >= batch_size:
            with conn.cursor() as cur:
                execute_values(cur,
                               "INSERT INTO public.sales_items(sale_id, product_name, quantity, unit_price, cost_price, total_amount) VALUES %s",
                               items,
                               page_size=len(items))
            items.clear()
        if processed - last_commit >= commit_every:
            conn.commit()
            last_commit = processed
        if processed % progress_every == 0:
            print(f"Processed {processed} sales item records...")

    if items:
        with conn.cursor() as cur:
            execute_values(cur,
                           "INSERT INTO public.sales_items(sale_id, product_name, quantity, unit_price, cost_price, total_amount) VALUES %s",
                           items,
                           page_size=len(items))
    conn.commit()
    return len(master_rows), processed


def import_purchases(conn, purchase_df: pd.DataFrame, nepali_year_default: int = 2081, batch_size: int = 1000, commit_every: int = 10000, progress_every: int = 5000) -> Tuple[int, int]:
    df = normalize_cols(purchase_df)
    cols = ["number_miti","description","quantity","purchase_rate","cp","amount","extracted_month","ref_no"]
    for c in cols:
        if c not in df.columns:
            df[c] = None
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["purchase_rate"] = pd.to_numeric(df["purchase_rate"], errors="coerce").fillna(0)
    df["cp"] = pd.to_numeric(df["cp"], errors="coerce").fillna(df["purchase_rate"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(df["quantity"] * df["purchase_rate"]) 
    df = df[df["quantity"] > 0]

    df["invoice_number_raw"] = df["ref_no"].fillna("")
    df["invoice_number"] = df["invoice_number_raw"].apply(lambda s: f"P-{s}" if s else f"P-AUTO-{pd.Timestamp.now().value}")

    masters = df[["invoice_number", "extracted_month", "number_miti"]].drop_duplicates()
    masters = masters.assign(purchase_date=lambda x: x.apply(lambda r: parse_sale_date(r, nepali_year_default), axis=1))
    masters = masters.assign(nepali_year=int(nepali_year_default))
    masters = masters.assign(nepali_month=lambda x: pd.to_numeric(x["extracted_month"], errors="coerce").fillna(1).astype(int))
    totals = df.groupby("invoice_number")["amount"].sum()
    masters = masters.assign(total_amount=lambda x: x["invoice_number"].map(totals).fillna(0.0))

    master_rows = [(row.invoice_number, row.purchase_date.to_pydatetime(), int(row.nepali_month), int(row.nepali_year), float(row.total_amount)) for row in masters.itertuples(index=False)]
    with conn.cursor() as cur:
        for i in range(0, len(master_rows), batch_size):
            execute_values(cur,
                           "INSERT INTO public.purchase_master(invoice_number, purchase_date, nepali_month, nepali_year, total_amount) VALUES %s ON CONFLICT (invoice_number) DO NOTHING",
                           master_rows[i:i+batch_size],
                           page_size=batch_size)
        conn.commit()
        cur.execute("SELECT purchase_id, invoice_number FROM public.purchase_master")
        mapping = {inv: pid for pid, inv in cur.fetchall()}

    items: List[Tuple] = []
    processed = 0
    last_commit = 0
    for r in df.itertuples(index=False):
        inv = getattr(r, "invoice_number")
        pid = mapping.get(inv)
        if not pid:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.purchase_master(invoice_number, purchase_date, nepali_month, nepali_year, total_amount) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (invoice_number) DO UPDATE SET purchase_date = EXCLUDED.purchase_date RETURNING purchase_id",
                    (inv, parse_sale_date(r, nepali_year_default).to_pydatetime(), int(getattr(r, "extracted_month") or 1), int(nepali_year_default), float(getattr(r, "amount") or 0.0)),
                )
                pid = cur.fetchone()[0]
                mapping[inv] = pid
        name = str(getattr(r, "description") or "").strip()
        if not name:
            continue
        qty = float(getattr(r, "quantity") or 0)
        unit_price = float(getattr(r, "purchase_rate") or 0)
        cp = float(getattr(r, "cp") or unit_price)
        amt = float(getattr(r, "amount") or qty * unit_price)
        items.append((pid, name, qty, unit_price, cp, amt))
        processed += 1

        if len(items) >= batch_size:
            with conn.cursor() as cur:
                execute_values(cur,
                               "INSERT INTO public.purchase_items(purchase_id, product_name, quantity, unit_price, cost_price, total_amount) VALUES %s",
                               items,
                               page_size=len(items))
            items.clear()
        if processed - last_commit >= commit_every:
            conn.commit()
            last_commit = processed
        if processed % progress_every == 0:
            print(f"Processed {processed} purchase item records...")

    if items:
        with conn.cursor() as cur:
            execute_values(cur,
                           "INSERT INTO public.purchase_items(purchase_id, product_name, quantity, unit_price, cost_price, total_amount) VALUES %s",
                           items,
                           page_size=len(items))
    conn.commit()
    return len(master_rows), processed


def main():
    parser = argparse.ArgumentParser(description="Import master-detail data from cleaned CSVs into PostgreSQL.")
    parser.add_argument("--sales-csv", default="sales_data_clean.csv")
    parser.add_argument("--purchase-csv", default="Purchase_data_clean.csv")
    parser.add_argument("--db-url", default=None)
    parser.add_argument("--env", default=str(DEF_ENV))
    parser.add_argument("--nepali-year-default", type=int, default=2081)
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--commit-every", type=int, default=10000)
    parser.add_argument("--progress-every", type=int, default=5000)
    args = parser.parse_args()

    sales_csv = Path(args.sales_csv)
    purchase_csv = Path(args.purchase_csv)
    if not sales_csv.exists():
        raise SystemExit(f"Sales CSV not found: {sales_csv}")
    if not purchase_csv.exists():
        print(f"Warning: Purchase CSV not found: {purchase_csv}")

    db_url = read_db_url(args.db_url, Path(args.env))
    conn = connect(db_url)
    try:
        sales_df = pd.read_csv(sales_csv, low_memory=False)
        purchase_df = pd.read_csv(purchase_csv, low_memory=False) if purchase_csv.exists() else pd.DataFrame([])

        product_map = ensure_products(conn, sales_df, batch_size=args.batch_size)
        print(f"Products ready: {len(product_map)}")

        sm, si = import_sales(conn, sales_df, nepali_year_default=args.nepali_year_default, batch_size=args.batch_size, commit_every=args.commit_every, progress_every=args.progress_every)
        print(f"Sales masters processed: {sm}; sales items inserted: {si}")

        if not purchase_df.empty:
            pm, pi = import_purchases(conn, purchase_df, nepali_year_default=args.nepali_year_default, batch_size=args.batch_size, commit_every=args.commit_every, progress_every=args.progress_every)
            print(f"Purchase masters processed: {pm}; purchase items inserted: {pi}")
        else:
            print("Skipping purchases: CSV missing.")
    finally:
        conn.close()


if __name__ == "__main__":
    pd.options.mode.use_inf_as_na = True
    main()
