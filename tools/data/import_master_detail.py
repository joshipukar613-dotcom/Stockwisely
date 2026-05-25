import argparse
import os
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values


def read_db_url(default_env: Path) -> str:
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    if default_env.exists():
        for line in default_env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("DATABASE_URL not found. Provide --db-url or ensure backend/.env exists.")


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
    }
    df.columns = [mapping.get(str(c).strip(), str(c).strip().lower().replace(" ", "_")) for c in df.columns]
    for c in df.select_dtypes(include=["object"]).columns:
        df[c] = df[c].astype(str).str.strip()
    return df


def categorize_product(name: str) -> str:
    n = (name or "").lower()
    rules = {
        "bakery": ["bread", "cake", "biscuit", "cookie", "donut", "pastry"],
        "beverages": ["juice", "drink", "tea", "coffee", "soda", "cola", "water"],
        "snacks": ["chips", "kurkure", "namkeen", "popcorn", "snack"],
        "dairy": ["milk", "cheese", "butter", "yogurt", "curd"],
        "personal_care": ["soap", "shampoo", "toothpaste", "cream", "lotion"],
        "household": ["detergent", "cleaner", "mop", "bucket", "foil", "wrap"],
        "confectionery": ["chocolate", "candy", "toffee", "bar"],
        "spices": ["masala", "spice", "turmeric", "cumin", "chilli", "pepper"],
        "grains": ["rice", "flour", "atta", "maida", "suji", "lentil", "dal"],
        "oil_ghee": ["oil", "ghee", "butter oil"],
    }
    for cat, kws in rules.items():
        if any(k in n for k in kws):
            return cat.upper()
    return "MISC"


def connect(db_url: str):
    return psycopg2.connect(db_url)


def ensure_products(conn, sales_df: pd.DataFrame) -> int:
    df = normalize_cols(sales_df)
    df = df[["code", "description"]].copy()
    df["code"] = pd.to_numeric(df["code"], errors="coerce")
    df = df.dropna(subset=["code", "description"], how="any")
    df["product_code"] = df["code"].astype(int).astype(str)
    df["description"] = df["description"].astype(str)
    df["category"] = df["description"].map(categorize_product)
    df = df.drop_duplicates(subset=["product_code"]).reset_index(drop=True)

    rows = [(r.product_code, r.description, r.category) for r in df.itertuples(index=False)]
    sql = """
        INSERT INTO public.products(product_code, description, category)
        VALUES %s
        ON CONFLICT (product_code) DO NOTHING
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows, page_size=1000)
    conn.commit()
    return len(rows)


def parse_sale_date(row) -> pd.Timestamp:
    m = pd.to_numeric(row.get("extracted_month"), errors="coerce")
    if pd.notnull(m) and 1 <= int(m) <= 12:
        return pd.Timestamp(year=pd.Timestamp.today().year, month=int(m), day=1)
    s = str(row.get("number_miti"))
    parts = s.split("/")
    if len(parts) >= 2 and parts[1].isdigit():
        month = int(parts[1])
        month = month if 1 <= month <= 12 else 1
        return pd.Timestamp(year=pd.Timestamp.today().year, month=month, day=1)
    return pd.Timestamp.today()


def import_sales(conn, sales_df: pd.DataFrame, batch_commit: int = 10000) -> Tuple[int, int]:
    df = normalize_cols(sales_df)
    needed = [
        "number_miti","code","description","quantity","sales_rate","amount","extracted_month","source_file"
    ]
    for c in needed:
        if c not in df.columns:
            df[c] = None
    df["code"] = pd.to_numeric(df["code"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    df["sales_rate"] = pd.to_numeric(df["sales_rate"], errors="coerce")
    df = df.dropna(subset=["code","quantity","sales_rate"], how="any")
    df = df[df["quantity"] > 0]
    df["product_code"] = df["code"].astype(int).astype(str)

    # Build master records
    df["invoice_number_raw"] = df["number_miti"].fillna("")
    df["invoice_number"] = df["invoice_number_raw"].apply(lambda s: s if s else f"S-AUTO-{pd.Timestamp.now().value}")

    masters = (
        df[["invoice_number", "extracted_month", "number_miti"]]
        .drop_duplicates()
        .assign(sale_date=lambda x: x.apply(parse_sale_date, axis=1))
    )
    master_rows = [(f"{row.invoice_number}", row.sale_date.to_pydatetime()) for row in masters.itertuples(index=False)]

    # Insert masters and get ids
    inserted_master = 0
    with conn.cursor() as cur:
        sql = "INSERT INTO public.sales_master(invoice_number, sale_date) VALUES %s ON CONFLICT (invoice_number) DO NOTHING RETURNING id, invoice_number"
        try:
            execute_values(cur, sql, master_rows, page_size=1000, fetch=True)
            res = cur.fetchall() if cur.rowcount else []
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            res = []
        # Build mapping invoice_number -> id
        cur.execute("SELECT id, invoice_number FROM public.sales_master")
        mapping = {inv: sid for sid, inv in cur.fetchall()}
        inserted_master = len(master_rows)

    # Prepare items
    item_rows: List[Tuple] = []
    for r in df.itertuples(index=False):
        inv = getattr(r, "invoice_number")
        sid = mapping.get(inv)
        if not sid:
            # Fallback: create missing master
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.sales_master(invoice_number, sale_date) VALUES (%s, %s) ON CONFLICT (invoice_number) DO UPDATE SET sale_date = EXCLUDED.sale_date RETURNING id",
                    (inv, parse_sale_date(r).to_pydatetime()),
                )
                sid = cur.fetchone()[0]
                mapping[inv] = sid
        item_rows.append((sid, getattr(r, "product_code"), getattr(r, "description"), float(getattr(r, "quantity")), float(getattr(r, "sales_rate"))))

    inserted_items = 0
    with conn.cursor() as cur:
        sql_items = "INSERT INTO public.sales_items(sale_id, product_code, product_name, quantity, price) VALUES %s"
        for i in range(0, len(item_rows), 1000):
            batch = item_rows[i:i+1000]
            execute_values(cur, sql_items, batch, page_size=1000)
            inserted_items += len(batch)
            if inserted_items % 5000 == 0:
                print(f"Processed {inserted_items}/{len(item_rows)} sales items...")
            if inserted_items % batch_commit == 0:
                conn.commit()
    conn.commit()
    return inserted_master, inserted_items


def import_purchases(conn, purchase_df: pd.DataFrame, batch_commit: int = 10000) -> Tuple[int, int]:
    df = normalize_cols(purchase_df)
    for c in ["number_miti","code","description","quantity","purchase_rate","ref_no","extracted_month"]:
        if c not in df.columns:
            df[c] = None
    df["code"] = pd.to_numeric(df["code"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    rate_series = df["purchase_rate"] if "purchase_rate" in df.columns else df.get("rate")
    df["purchase_rate"] = pd.to_numeric(rate_series, errors="coerce")
    df = df.dropna(subset=["code","quantity","purchase_rate"], how="any")
    df = df[df["quantity"] > 0]
    df["product_code"] = df["code"].astype(int).astype(str)

    df["invoice_number_raw"] = df["ref_no"].fillna("")
    df["invoice_number"] = df["invoice_number_raw"].apply(lambda s: f"P-{s}" if s else f"P-AUTO-{pd.Timestamp.now().value}")

    masters = df[["invoice_number", "extracted_month", "number_miti"]].drop_duplicates().assign(purchase_date=lambda x: x.apply(parse_sale_date, axis=1))
    master_rows = [(f"{row.invoice_number}", row.purchase_date.to_pydatetime()) for row in masters.itertuples(index=False)]

    inserted_master = 0
    with conn.cursor() as cur:
        sql = "INSERT INTO public.purchase_master(invoice_number, purchase_date) VALUES %s ON CONFLICT (invoice_number) DO NOTHING RETURNING id, invoice_number"
        try:
            execute_values(cur, sql, master_rows, page_size=1000, fetch=True)
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
        cur.execute("SELECT id, invoice_number FROM public.purchase_master")
        mapping = {inv: pid for pid, inv in cur.fetchall()}
        inserted_master = len(master_rows)

    item_rows: List[Tuple] = []
    for r in df.itertuples(index=False):
        inv = getattr(r, "invoice_number")
        pid = mapping.get(inv)
        if not pid:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO public.purchase_master(invoice_number, purchase_date) VALUES (%s, %s) ON CONFLICT (invoice_number) DO UPDATE SET purchase_date = EXCLUDED.purchase_date RETURNING id",
                    (inv, parse_sale_date(r).to_pydatetime()),
                )
                pid = cur.fetchone()[0]
                mapping[inv] = pid
        item_rows.append((pid, getattr(r, "product_code"), getattr(r, "description"), float(getattr(r, "quantity")), float(getattr(r, "purchase_rate"))))

    inserted_items = 0
    with conn.cursor() as cur:
        sql_items = "INSERT INTO public.purchase_items(purchase_id, product_code, product_name, quantity, price) VALUES %s"
        for i in range(0, len(item_rows), 1000):
            batch = item_rows[i:i+1000]
            execute_values(cur, sql_items, batch, page_size=1000)
            inserted_items += len(batch)
            if inserted_items % 5000 == 0:
                print(f"Processed {inserted_items}/{len(item_rows)} purchase items...")
            if inserted_items % batch_commit == 0:
                conn.commit()
    conn.commit()
    return inserted_master, inserted_items


def run_products(conn, sales_csv: Path) -> int:
    df = pd.read_csv(sales_csv, low_memory=False)
    count = ensure_products(conn, df)
    return count


def run_sales(conn, sales_csv: Path) -> Tuple[int, int]:
    df = pd.read_csv(sales_csv, low_memory=False)
    return import_sales(conn, df)


def run_purchases(conn, purchase_csv: Path) -> Tuple[int, int]:
    df = pd.read_csv(purchase_csv, low_memory=False)
    return import_purchases(conn, df)


def main():
    parser = argparse.ArgumentParser(description="Import master-detail data from cleaned CSVs into PostgreSQL.")
    parser.add_argument("--sales-csv", default="sales_data_clean.csv", help="Path to sales CSV")
    parser.add_argument("--purchase-csv", default="Purchase_data_clean.csv", help="Path to purchase CSV")
    parser.add_argument("--db-url", help="PostgreSQL connection URL; defaults to backend/.env DATABASE_URL")
    parser.add_argument("--env", default=str(Path("backend/.env")), help="Path to backend .env")
    parser.add_argument("--commit-batch", type=int, default=10000, help="Commit every N item inserts")
    args = parser.parse_args()

    sales_csv = Path(args.sales_csv)
    purchase_csv = Path(args.purchase_csv)
    if not sales_csv.exists():
        raise SystemExit(f"Sales CSV not found: {sales_csv}")
    if not purchase_csv.exists():
        print(f"Warning: Purchase CSV not found: {purchase_csv}")

    db_url = args.db_url or read_db_url(Path(args.env))
    conn = connect(db_url)

    try:
        print("Step 1: Importing products...")
        prod_count = run_products(conn, sales_csv)
        print(f"Products inserted: {prod_count}")

        print("Step 2: Importing sales master-detail...")
        sm, si = run_sales(conn, sales_csv)
        print(f"Sales masters processed: {sm}; sales items inserted: {si}")

        if purchase_csv.exists():
            print("Step 3: Importing purchase master-detail...")
            pm, pi = run_purchases(conn, purchase_csv)
            print(f"Purchase masters processed: {pm}; purchase items inserted: {pi}")
        else:
            print("Skipping purchases: CSV missing.")
    finally:
        conn.close()


if __name__ == "__main__":
    pd.options.mode.use_inf_as_na = True
    main()

