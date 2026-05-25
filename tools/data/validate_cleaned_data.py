import argparse
import os
from pathlib import Path
from typing import List, Dict

import pandas as pd


def find_data_files(directory: Path) -> List[Path]:
    patterns = [
        # Excel
        "*purchase*clean*.xlsx",
        "*sales*clean*.xlsx",
        "*stock*clean*.xlsx",
        "*return*clean*.xlsx",
        "*ml_training_data_complete*.xlsx",
        # CSV
        "*purchase*clean*.csv",
        "*sales*clean*.csv",
        "*stock*clean*.csv",
        "*return*clean*.csv",
        "*ml_training_data_complete*.csv",
    ]
    files: List[Path] = []
    for pat in patterns:
        files.extend(directory.glob(pat))
    # De-duplicate while preserving order
    seen = set()
    unique_files = []
    for f in files:
        if f not in seen:
            unique_files.append(f)
            seen.add(f)
    return unique_files


def normalize_object_columns(df: pd.DataFrame) -> Dict[str, int]:
    changes = {}
    for col in df.select_dtypes(include=['object']).columns:
        before = df[col].copy()
        df[col] = df[col].astype(str).str.strip()
        diff_count = (before != df[col]).sum()
        if diff_count:
            changes[col] = int(diff_count)
    return changes


def coerce_numeric(df: pd.DataFrame) -> List[str]:
    coerced_cols = []
    for col in df.columns:
        if df[col].dtype.kind in 'bifc':
            continue
        # Try to coerce to numeric if it looks numeric-like
        sample = df[col].dropna().astype(str).head(50)
        if sample.empty:
            continue
        numeric_like = sample.str.match(r"^[\s-]*[0-9]+(\.[0-9]+)?\s*$").mean() > 0.8
        if numeric_like:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            coerced_cols.append(col)
    return coerced_cols


def fix_negatives(df: pd.DataFrame) -> Dict[str, int]:
    fixed = {}
    # Allow negatives on any column that includes 'discount' case-insensitively
    def allow_negative(col_name: str) -> bool:
        n = col_name.lower()
        return 'discount' in n or 'disc' in n

    for col in df.select_dtypes(include=['number']).columns:
        if allow_negative(col):
            continue
        mask = df[col] < 0
        count = int(mask.sum())
        if count:
            # Set negatives to 0 by default
            df.loc[mask, col] = 0
            fixed[col] = count
    return fixed


def validate_and_fix_file(path: Path, out_dir: Path) -> Dict:
    report = {
        'file': str(path),
        'rows': 0,
        'cols': 0,
        'trimmed': {},
        'coerced_numeric': [],
        'fixed_negatives': {},
        'output_file': None,
    }
    # Read CSV or Excel
    try:
        if path.suffix.lower() == ".csv":
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path, engine='openpyxl')
    except Exception as e:
        report['error'] = f"Failed to read file: {e}"
        return report

    report['rows'], report['cols'] = int(df.shape[0]), int(df.shape[1])

    # Trim spaces in text columns
    report['trimmed'] = normalize_object_columns(df)

    # Coerce numeric-looking text columns
    report['coerced_numeric'] = coerce_numeric(df)

    # Fix negatives except discount columns
    report['fixed_negatives'] = fix_negatives(df)

    # Write corrected output next to original
    # Write corrected output next to original
    if path.suffix.lower() == ".csv":
        out_name = path.stem + "_validated.csv"
        out_path = out_dir / out_name
        try:
            df.to_csv(out_path, index=False)
            report['output_file'] = str(out_path)
        except Exception as e:
            report['error'] = f"Failed to write CSV: {e}"
    else:
        out_name = path.stem + "_validated.xlsx"
        out_path = out_dir / out_name
        try:
            df.to_excel(out_path, index=False)
            report['output_file'] = str(out_path)
        except Exception as e:
            report['error'] = f"Failed to write Excel: {e}"
    return report


def write_report(reports: List[Dict], out_dir: Path) -> Path:
    lines = []
    lines.append("Cleaned Data Validation Report")
    lines.append("================================\n")
    for rep in reports:
        lines.append(f"File: {rep.get('file')}")
        if rep.get('error'):
            lines.append(f"  ERROR: {rep['error']}\n")
            continue
        lines.append(f"  Rows x Cols: {rep['rows']} x {rep['cols']}")
        if rep['trimmed']:
            lines.append("  Trimmed whitespace (changes per column):")
            for col, cnt in rep['trimmed'].items():
                lines.append(f"    - {col}: {cnt}")
        if rep['coerced_numeric']:
            lines.append("  Coerced to numeric:")
            for col in rep['coerced_numeric']:
                lines.append(f"    - {col}")
        if rep['fixed_negatives']:
            lines.append("  Fixed negatives (set to 0):")
            for col, cnt in rep['fixed_negatives'].items():
                lines.append(f"    - {col}: {cnt}")
        lines.append(f"  Output: {rep.get('output_file')}\n")

    report_path = out_dir / "validation_report.txt"
    report_path.write_text("\n".join(lines), encoding='utf-8')
    return report_path


def main():
    parser = argparse.ArgumentParser(description="Validate and fix cleaned Excel data.")
    parser.add_argument("--cleaned-dir", required=True, help="Directory containing cleaned Excel files.")
    parser.add_argument("--out-dir", default=None, help="Directory to write validated outputs and report.")
    args = parser.parse_args()

    cleaned_dir = Path(args.cleaned_dir).expanduser()
    if args.out_dir:
        out_dir = Path(args.out_dir).expanduser()
    else:
        out_dir = cleaned_dir

    if not cleaned_dir.exists():
        raise SystemExit(f"Cleaned directory not found: {cleaned_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)

    files = find_data_files(cleaned_dir)
    if not files:
        raise SystemExit("No data files found (CSV/XLSX) matching expected patterns in cleaned directory.")

    reports = []
    for f in files:
        rep = validate_and_fix_file(f, out_dir)
        reports.append(rep)

    report_path = write_report(reports, out_dir)
    print(f"Report written to: {report_path}")


if __name__ == "__main__":
    # Pandas options for consistent outputs
    pd.options.mode.use_inf_as_na = True
    main()
