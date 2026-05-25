import os
import re
import glob
import pandas as pd
import psycopg2
from datetime import datetime

def parse_bs_date(bs_str):
    try:
        from nepali_datetime import date as NepaliDate
        parts = re.split(r'[/-]', str(bs_str).strip())
        if len(parts) != 3:
            return None
        y, m, d = [int(p) for p in parts]
        nd = NepaliDate(y, m, d)
        ad = nd.to_datetime_date()
        return ad
    except:
        return None

def normalize_name(s):
    if not isinstance(s, str):
        return None
    s = str(s).strip()
    if ' - ' in s:
        s = s.split(' - ', 1)[1]
    s = s.lower()
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s if s else None

def extract_purchase_dates(excel_dir):
    print(f'Reading Excel files from: {excel_dir}')
    
    files = glob.glob(os.path.join(excel_dir, '*.xlsx'))
    print(f'Found {len(files)} Excel files')
    
    earliest_dates = {}
    total_dates_found = 0
    total_products_found = 0
    
    for filepath in files:
        filename = os.path.basename(filepath)
        print(f'Processing {filename}...')
        
        try:
            df = pd.read_excel(filepath, header=None, engine='openpyxl')
        except:
            print(f'  Error reading {filename}, skipping')
            continue
        
        print(f'  Total rows: {len(df)}')
        
        current_date = None
        file_dates = 0
        file_products = 0
        
        for idx, row in df.iterrows():
            col_b = row.iloc[1] if len(row) > 1 else None
            col_e = row.iloc[4] if len(row) > 4 else None
            
            if pd.notna(col_b):
                bs_str = str(col_b).strip()
                if re.match(r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}$', bs_str):
                    ad_date = parse_bs_date(bs_str)
                    if ad_date:
                        current_date = ad_date
                        file_dates += 1
            
            if current_date and pd.notna(col_e):
                product_str = str(col_e).strip()
                
                if any(x in product_str.upper() for x in ['DISCOUNT', 'VAT', 'INVOICE TOTAL', '@']):
                    continue
                
                normalized = normalize_name(product_str)
                if normalized:
                    if normalized not in earliest_dates or current_date < earliest_dates[normalized]:
                        earliest_dates[normalized] = current_date
                        file_products += 1
        
        print(f'  Dates found: {file_dates}, Products: {file_products}')
        total_dates_found += file_dates
        total_products_found += file_products
    
    print(f'\nSummary:')
    print(f'  Total dates found: {total_dates_found}')
    print(f'  Total product entries: {total_products_found}')
    print(f'  Unique products: {len(earliest_dates)}')
    
    if earliest_dates:
        dates = list(earliest_dates.values())
        print(f'  Date range: {min(dates)} to {max(dates)}')
    
    return earliest_dates

def update_database(earliest_dates, dry_run=False):
    if not earliest_dates:
        print('No purchase dates to update')
        return
    
    db_password = os.environ.get('DB_PASSWORD')
    if not db_password:
        print('Error: DB_PASSWORD environment variable not set')
        return
    
    print(f'\nConnecting to PostgreSQL...')
    conn = psycopg2.connect(
        host='localhost',
        port=5433,
        user='postgres',
        password=db_password,
        database='stock_wisely'
    )
    
    cur = conn.cursor()
    
    cur.execute('SELECT id, description, created_at FROM products')
    products = cur.fetchall()
    print(f'Found {len(products)} products in database')
    
    updates = []
    for prod_id, description, current_date in products:
        normalized = normalize_name(description)
        if normalized and normalized in earliest_dates:
            new_date = earliest_dates[normalized]
            updates.append((new_date, prod_id))
    
    print(f'\nMatched {len(updates)} products')
    
    if updates:
        earliest_update = min(u[0] for u in updates)
        latest_update = max(u[0] for u in updates)
        print(f'  Date range: {earliest_update} to {latest_update}')
        print(f'  Not matched: {len(products) - len(updates)} products')
    
    if dry_run:
        print(f'\nDRY RUN - Would update {len(updates)} products')
        print('No changes made to database')
    else:
        print(f'\nUpdating {len(updates)} products...')
        cur.executemany(
            'UPDATE products SET created_at = %s, updated_at = %s WHERE id = %s',
            [(date, date, pid) for date, pid in updates]
        )
        conn.commit()
        print(f'✅ Successfully updated {len(updates)} products')
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    import sys
    
    excel_dir = 'C:/Users/ACER/Documents/Aiinventorydata/PurchaseData'
    dry_run = '--dry-run' in sys.argv
    
    print('=' * 60)
    print('Product Registration Date Updater')
    print('=' * 60)
    
    earliest_dates = extract_purchase_dates(excel_dir)
    
    if earliest_dates:
        update_database(earliest_dates, dry_run=dry_run)
    else:
        print('\nNo purchase dates found in Excel files')