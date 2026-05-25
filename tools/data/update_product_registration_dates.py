import os
import re
import glob
import argparse
from datetime import datetime, date
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

def normalize_name(s):
    if not isinstance(s, str):
        return None
    s = s.strip()
    if " - " in s:
        s = s.split(" - ", 1)[1]
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s or None

def parse_bs_date(bs_str):
    try:
        from nepali_datetime import date as NepaliDate
    except Exception:
        raise RuntimeError("Install nepali-datetime: pip install nepali-datetime")
    if not isinstance(bs_str, str):
        raise ValueError("Invalid BS date string")
    parts = re.split(r"[/-]", bs_str.strip())
    if len(parts) != 3:
        raise ValueError("Invalid BS date format")
    y, m, d = [int(p) for p in parts]
    nd = NepaliDate(y, m, d)
    ad = nd.to_datetime_date()
    if isinstance(ad, datetime):
        ad = ad.date()
    return ad

def collect_first_purchase_dates(src_dir):
    pattern = os.path.join(src_dir, "*.xlsx")
    files = sorted(glob.glob(pattern))
    earliest = {}
    for f in files:
        try:
            df = pd.read_excel(f, header=None, engine="openpyxl")
        except Exception:
            df = pd.read_excel(f, header=None)
        if df.shape[1] < 5:
            continue
        for _, row in df.iterrows():
            bs = row.iloc[1]
            name = row.iloc[4]
            n = normalize_name(name)
            if not n:
                continue
            try:
                ad = parse_bs_date(str(bs))
            except Exception:
                continue
            prev = earliest.get(n)
            if prev is None or ad < prev:
                earliest[n] = ad
    return earliest

def load_products(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, description, created_at FROM products")
        rows = cur.fetchall()
    products = []
    for r in rows:
        pid, desc, created = r
        products.append({"id": pid, "desc": desc, "created_at": created})
    return products

def update_created_at(conn, updates):
    with conn.cursor() as cur:
        execute_batch(cur, "UPDATE products SET created_at = %s WHERE id = %s", updates, page_size=500)
    conn.commit()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default=r"C:\Users\ACER\Documents\Aiinventorydata\PurchaseData", help="Directory containing monthly Excel files")
    parser.add_argument("--host", default=os.environ.get("DB_HOST", "localhost"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("DB_PORT", "5433")))
    parser.add_argument("--user", default=os.environ.get("DB_USER", "postgres"))
    parser.add_argument("--dbname", default=os.environ.get("DB_NAME", "stock_wisely"))
    parser.add_argument("--password", default=os.environ.get("DB_PASSWORD"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.password:
        raise RuntimeError("Set DB_PASSWORD in environment or pass --password")

    earliest = collect_first_purchase_dates(args.dir)
    if not earliest:
        print("No purchase dates found")
        return

    conn = psycopg2.connect(host=args.host, port=args.port, user=args.user, password=args.password, dbname=args.dbname)
    try:
        products = load_products(conn)
        updates = []
        matched = 0
        for p in products:
            n = normalize_name(p["desc"])
            if not n:
                continue
            if n in earliest:
                matched += 1
                new_date = earliest[n]
                if isinstance(new_date, datetime):
                    new_date = new_date.date()
                updates.append((new_date, p["id"]))
        if args.dry_run:
            print(f"Matched products: {matched}")
            if updates:
                dates = [u[0] for u in updates]
                print(f"Will update: {len(updates)}")
                print(f"Oldest: {min(dates)} Newest: {max(dates)}")
            return
        if updates:
            update_created_at(conn, updates)
        dates = [earliest[k] for k in earliest]
        print(f"Updated products: {len(updates)}")
        print(f"Date range: {min(dates)} to {max(dates)}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
