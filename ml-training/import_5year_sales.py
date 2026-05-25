"""
import_5year_sales.py
Import 5 years (2078-2082 BS) of Sajilo POS sales data into the Stock Wisely database.
Uses nepali-datetime for accurate BS→AD date conversion.
Skips duplicates using ON CONFLICT DO NOTHING + rowcount checks.
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
import re
import sys
from collections import defaultdict
from nepali_datetime import date as NepaliDate

# ── Configuration ────────────────────────────────────────────
DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "database": "stock_wisely",
    "user": "postgres",
    "password": "Pukar321$"
}

DATA_ROOT = r"C:\Users\ACER\Documents\Aiinventorydata\SalesData"

# Map directory names to BS years
DIR_TO_BS_YEAR = {
    "sales 2078": 2078,
    "sales2079": 2079,
    "sales2080": 2080,
    "sales2081": 2081,
    "sales2082": 2082,
}

# Map month numbers within a BS year (Baishak=1 .. Chaitra=12)
# used as fallback when filename has a month number
NEPALI_MONTH_NAMES = {
    "baishak": 1, "baisakh": 1, "baisak": 1,
    "jestha": 2, "jeth": 2, "zhed": 2, "jhed": 2,
    "ashadh": 3, "ashad": 3, "asar": 3, "ashar": 3,
    "shrawan": 4, "shawan": 4, "shawn": 4, "sawan": 4, "saun": 4,
    "bhadra": 5, "bhadau": 5,
    "ashoj": 6, "ashwin": 6, "asoj": 6,
    "kartik": 7, "karthik": 7,
    "mangsir": 8, "mangshir": 8,
    "poush": 9, "push": 9, "pus": 9,
    "magh": 10, "mag": 10,
    "falgun": 11, "fagun": 11, "phagun": 11,
    "chaitra": 12, "chitra": 12, "chait": 12,
}


# ── Nepali→AD conversion ────────────────────────────────────
def bs_to_ad(bs_year, bs_month, bs_day):
    """Convert BS date to AD date using nepali-datetime for accuracy."""
    try:
        # Clamp day to valid range
        bs_day = max(1, min(bs_day, 32))
        try:
            nd = NepaliDate(bs_year, bs_month, bs_day)
        except ValueError:
            # Day out of range for this month, try clamping down
            for d in range(bs_day, 0, -1):
                try:
                    nd = NepaliDate(bs_year, bs_month, d)
                    break
                except ValueError:
                    continue
            else:
                return None
        return nd.to_datetime_date()
    except Exception:
        return None


def parse_nepali_date_str(date_str):
    """Parse a Nepali date string like '2078/01/15' and convert to AD."""
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            return bs_to_ad(y, m, d)
    except Exception:
        pass
    return None


def extract_bs_year_month_from_report_date(text):
    """Extract BS year and month from the 'Report Date' row text."""
    # Pattern: "Report Date :  2078/01/01 to 2078/01/30"
    match = re.search(r'(\d{4})/(\d{2})/\d{2}\s+to\s+(\d{4})/(\d{2})/\d{2}', str(text))
    if match:
        y1, m1 = int(match.group(1)), int(match.group(2))
        return y1, m1
    # Simpler pattern: just first date
    match = re.search(r'(\d{4})/(\d{2})', str(text))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None


def guess_bs_month_from_filename(filename, bs_year):
    """Guess the BS month from the filename."""
    fn_lower = filename.lower().replace('.xlsx', '').replace('.xls', '')

    # Pattern: sales207801 → month 01
    match = re.search(r'(\d{4})(\d{2})', fn_lower)
    if match:
        file_year = int(match.group(1))
        file_month = int(match.group(2))
        if 1 <= file_month <= 12:
            return file_year, file_month

    # Pattern: month name like "baishak82", "shawn", "BHADRA", etc.
    for name, month_num in NEPALI_MONTH_NAMES.items():
        if name in fn_lower:
            # Check if filename contains a year suffix like "82"
            year_match = re.search(r'(\d{2})$', fn_lower.replace(name, '').strip())
            if year_match:
                short_year = int(year_match.group(1))
                full_year = 2000 + short_year
                return full_year, month_num
            return bs_year, month_num

    return bs_year, 1  # fallback


# ── Excel parser ─────────────────────────────────────────────
def parse_sajilo_excel(filepath, default_bs_year):
    """
    Parse a Sajilo POS Sales Invoice Register Excel file.
    Returns list of invoice dicts with items.
    """
    filename = os.path.basename(filepath)

    try:
        df = pd.read_excel(filepath, header=None)
    except Exception as e:
        print(f"      ❌ Cannot read {filename}: {e}")
        return []

    total_rows = len(df)

    # ── Find header row and extract report date ──
    header_row = None
    bs_year_from_report = None
    bs_month_from_report = None

    for idx in range(min(20, total_rows)):
        row_text = ' '.join([str(v) for v in df.iloc[idx].values if pd.notna(v)])

        # Check for report date
        if 'Report Date' in row_text or 'report date' in row_text.lower():
            bs_year_from_report, bs_month_from_report = extract_bs_year_month_from_report_date(row_text)

        # Check for header
        if 'NUMBER' in row_text and 'MITI' in row_text:
            header_row = idx
            break

    if header_row is None:
        print(f"      ⚠️  No header row found in {filename}, skipping")
        return []

    # Determine BS year/month for this file
    if bs_year_from_report and bs_month_from_report:
        file_bs_year = bs_year_from_report
        file_bs_month = bs_month_from_report
    else:
        file_bs_year, file_bs_month = guess_bs_month_from_filename(filename, default_bs_year)

    # Calculate a fallback AD date (mid-month) for invoices without explicit dates
    fallback_ad_date = bs_to_ad(file_bs_year, file_bs_month, 15)
    if fallback_ad_date is None:
        # Last resort
        from datetime import date
        fallback_ad_date = date(file_bs_year - 57, 1, 15)

    # ── Parse data rows ──
    invoices = []
    current_invoice = None
    current_date_ad = fallback_ad_date
    current_customer = None
    current_items = []

    for idx in range(header_row + 1, total_rows):
        row = df.iloc[idx]

        # Column indices (0-indexed):
        # 0: (unused/store name), 1: NUMBER/MITI, 2: CODE, 3: DESCRIPTION,
        # 4: QUANTITY, 5: SALES RATE, 6: CP, 7: AMOUNT
        col_miti = str(row.iloc[1]) if pd.notna(row.iloc[1]) else ''
        col_code = str(row.iloc[2]) if len(row) > 2 and pd.notna(row.iloc[2]) else ''
        col_desc = str(row.iloc[3]) if len(row) > 3 and pd.notna(row.iloc[3]) else ''
        col_qty = row.iloc[4] if len(row) > 4 else None
        col_rate = row.iloc[5] if len(row) > 5 else None
        col_amount = row.iloc[7] if len(row) > 7 else None

        col_miti = col_miti.strip()
        col_desc = col_desc.strip()
        col_code = col_code.strip()

        # Skip empty rows
        if not col_miti and not col_code and not col_desc:
            continue

        # ── Invoice header: SI81-AF-1, TI81-AF-176, etc. ──
        if re.match(r'^(SI|TI)\d*[-/]\w+', col_miti):
            # Save previous invoice
            if current_invoice and current_items:
                invoices.append({
                    'invoice_number': current_invoice,
                    'customer': current_customer,
                    'date_ad': current_date_ad,
                    'items': current_items.copy()
                })

            current_invoice = col_miti
            current_items = []
            current_date_ad = fallback_ad_date
            current_customer = None

            # Check if CODE column has "Cash Sales"
            if 'cash' in col_code.lower() or 'cash' in col_desc.lower():
                current_customer = col_desc[:100] if col_desc else 'Cash Sales'

            continue

        # ── Date row: YYYY/MM/DD ──
        if re.match(r'^\d{4}/\d{2}/\d{2}$', col_miti):
            ad_date = parse_nepali_date_str(col_miti)
            if ad_date:
                current_date_ad = ad_date
            continue

        # ── Skip summary/total rows ──
        if col_desc and any(kw in col_desc.upper() for kw in
                           ['VAT :', 'VAT:', 'TOTAL :', 'TOTAL:', 'INVOICE TOTAL',
                            'DISCOUNT', 'NET AMOUNT', 'GRAND TOTAL']):
            continue

        # ── Product row: CODE + DESCRIPTION + QUANTITY ──
        if col_code and col_code != 'nan' and col_desc and col_desc != 'nan' and len(col_desc) > 2:
            try:
                qty = float(col_qty) if pd.notna(col_qty) else 0
                rate = float(col_rate) if pd.notna(col_rate) else 0
                amount = float(col_amount) if pd.notna(col_amount) else 0
            except (ValueError, TypeError):
                continue

            if qty > 0 and amount > 0:
                current_items.append({
                    'product_code': col_code,
                    'product_name': col_desc[:200],
                    'quantity': qty,
                    'rate': rate,
                    'amount': amount
                })

    # Save last invoice
    if current_invoice and current_items:
        invoices.append({
            'invoice_number': current_invoice,
            'customer': current_customer,
            'date_ad': current_date_ad,
            'items': current_items.copy()
        })

    return invoices


# ── Main execution ───────────────────────────────────────────
def main():
    print("=" * 70)
    print("STEP 1: IMPORTING 5 YEARS OF SALES DATA (2078-2082 BS)")
    print("=" * 70)

    # Discover all Excel files
    all_files = []
    for dir_name, bs_year in sorted(DIR_TO_BS_YEAR.items(), key=lambda x: x[1]):
        dir_path = os.path.join(DATA_ROOT, dir_name)
        if not os.path.isdir(dir_path):
            print(f"⚠️  Directory not found: {dir_path}")
            continue
        files = sorted([f for f in os.listdir(dir_path) if f.endswith(('.xlsx', '.xls'))])
        for f in files:
            all_files.append((os.path.join(dir_path, f), bs_year, f))
        print(f"  {dir_name}: {len(files)} files")

    print(f"\nTotal Excel files to process: {len(all_files)}")

    # ── Parse all files ──
    print("\n" + "=" * 70)
    print("PARSING EXCEL FILES")
    print("=" * 70)

    all_invoices = []
    all_products = set()
    stats_per_year = defaultdict(lambda: {'invoices': 0, 'items': 0, 'files': 0})

    for file_idx, (filepath, bs_year, filename) in enumerate(all_files, 1):
        print(f"\n  [{file_idx:02d}/{len(all_files)}] {filename} (BS {bs_year})")

        invoices = parse_sajilo_excel(filepath, bs_year)

        for inv in invoices:
            for item in inv['items']:
                all_products.add(item['product_name'])

        stats_per_year[bs_year]['invoices'] += len(invoices)
        stats_per_year[bs_year]['items'] += sum(len(inv['items']) for inv in invoices)
        stats_per_year[bs_year]['files'] += 1

        all_invoices.extend(invoices)
        print(f"      ✅ {len(invoices)} invoices extracted")

    # ── Summary ──
    print("\n" + "=" * 70)
    print("EXTRACTION SUMMARY")
    print("=" * 70)
    print(f"{'BS Year':<10} {'Files':<8} {'Invoices':<12} {'Items':<12}")
    print("-" * 42)
    for year in sorted(stats_per_year.keys()):
        s = stats_per_year[year]
        print(f"{year:<10} {s['files']:<8} {s['invoices']:<12,} {s['items']:<12,}")
    print("-" * 42)
    print(f"{'TOTAL':<10} {len(all_files):<8} {len(all_invoices):<12,} "
          f"{sum(len(inv['items']) for inv in all_invoices):<12,}")
    print(f"\nUnique products found: {len(all_products):,}")

    # ── Insert into database ──
    print("\n" + "=" * 70)
    print("INSERTING INTO DATABASE")
    print("=" * 70)

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()

    # 1. Insert new products
    print("\n1. Checking/inserting products...")
    cur.execute("SELECT description FROM products")
    existing_products = {row[0] for row in cur.fetchall()}
    new_products = all_products - existing_products

    if new_products:
        # Generate unique product codes
        cur.execute("SELECT MAX(CAST(SUBSTRING(product_code FROM 6) AS INTEGER)) FROM products WHERE product_code LIKE 'PROD-%'")
        max_code = cur.fetchone()[0] or 0
        next_code = max_code + 1

        values = []
        for p in new_products:
            values.append((f"PROD-{next_code:05d}", p, 'OTHER', True))
            next_code += 1

        execute_values(cur,
            "INSERT INTO products(product_code, description, category, is_active) VALUES %s ON CONFLICT DO NOTHING",
            values, page_size=1000)
        conn.commit()
        print(f"   ✅ Inserted {len(new_products):,} new products")
    else:
        print("   ✅ All products already exist")

    # 2. Insert invoices + items (with duplicate prevention)
    print("\n2. Inserting invoices and items...")

    new_invoices_count = 0
    duplicate_invoices_count = 0
    new_items_count = 0
    items_batch = []
    year_stats = defaultdict(lambda: {'new': 0, 'dup': 0, 'items': 0})

    for inv_idx, inv in enumerate(all_invoices, 1):
        invoice_number = inv['invoice_number']
        customer = inv['customer'] or 'Cash Sales'
        date_ad = inv['date_ad']
        total_amount = sum(item['amount'] for item in inv['items'])

        # Determine BS year from date
        # Approximate: AD year + 57 gives BS year
        inv_bs_year = date_ad.year + 57 if date_ad else 2081

        # Insert sales_master with ON CONFLICT
        cur.execute("""
            INSERT INTO sales_master(invoice_number, customer_name, sale_date, total_amount, total_items)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (invoice_number) DO NOTHING
        """, (invoice_number, customer[:100], date_ad, total_amount, len(inv['items'])))

        if cur.rowcount > 0:
            # New invoice — get its ID and insert items
            new_invoices_count += 1
            year_stats[inv_bs_year]['new'] += 1

            cur.execute("SELECT id FROM sales_master WHERE invoice_number = %s", (invoice_number,))
            sale_id = cur.fetchone()[0]

            for item in inv['items']:
                items_batch.append((
                    sale_id,
                    item['product_code'],
                    item['product_name'],
                    item['quantity'],
                    item['rate'],
                    item['amount']
                ))
                new_items_count += 1
                year_stats[inv_bs_year]['items'] += 1

            # Batch insert every 5000 items
            if len(items_batch) >= 5000:
                execute_values(cur,
                    "INSERT INTO sales_items(sale_id, product_code, product_name, quantity, price, amount) VALUES %s",
                    items_batch, page_size=1000)
                conn.commit()
                items_batch.clear()
                print(f"      ... processed {inv_idx:,}/{len(all_invoices):,} invoices, {new_items_count:,} new items")
        else:
            duplicate_invoices_count += 1
            year_stats[inv_bs_year]['dup'] += 1

    # Insert remaining items
    if items_batch:
        execute_values(cur,
            "INSERT INTO sales_items(sale_id, product_code, product_name, quantity, price, amount) VALUES %s",
            items_batch, page_size=1000)

    conn.commit()

    # ── Final report ──
    print("\n" + "=" * 70)
    print("IMPORT RESULTS")
    print("=" * 70)
    print(f"\n{'BS Year':<10} {'New Invoices':<15} {'Duplicates':<12} {'New Items':<12}")
    print("-" * 50)
    for year in sorted(year_stats.keys()):
        s = year_stats[year]
        print(f"{year:<10} {s['new']:<15,} {s['dup']:<12,} {s['items']:<12,}")
    print("-" * 50)
    print(f"{'TOTAL':<10} {new_invoices_count:<15,} {duplicate_invoices_count:<12,} {new_items_count:<12,}")

    # Verify date ranges
    print("\n" + "=" * 70)
    print("DATE RANGE VERIFICATION")
    print("=" * 70)
    cur.execute("""
        SELECT
            date_trunc('year', sale_date)::date as yr,
            MIN(sale_date)::date,
            MAX(sale_date)::date,
            COUNT(*)
        FROM sales_master
        GROUP BY yr
        ORDER BY yr
    """)
    print(f"{'Year':<12} {'Min Date':<14} {'Max Date':<14} {'Invoices':<10}")
    print("-" * 50)
    for row in cur.fetchall():
        print(f"{row[0]!s:<12} {row[1]!s:<14} {row[2]!s:<14} {row[3]:<10,}")

    # Total counts
    cur.execute("SELECT COUNT(*) FROM sales_master")
    total_invoices = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_items")
    total_items = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products")
    total_products = cur.fetchone()[0]

    print(f"\nDatabase totals after import:")
    print(f"  Sales invoices: {total_invoices:,}")
    print(f"  Sales items:    {total_items:,}")
    print(f"  Products:       {total_products:,}")

    cur.close()
    conn.close()

    print("\n" + "=" * 70)
    print("✅ STEP 1 COMPLETE: 5-Year Sales Data Imported!")
    print("=" * 70)


if __name__ == "__main__":
    main()
