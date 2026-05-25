"""
run_full_pipeline.py
Orchestrates the complete 5-year LSTM retraining pipeline.
Runs all 5 steps in order: Import → Categorize → Extract → Features → Train
"""

import subprocess
import sys
import time
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def run_step(step_num, description, script_name):
    """Run a pipeline step and handle errors."""
    print("\n" + "=" * 70)
    print(f"  PIPELINE STEP {step_num}: {description}")
    print("=" * 70 + "\n")
    
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    
    if not os.path.exists(script_path):
        print(f"❌ Script not found: {script_path}")
        return False
    
    start_time = time.time()
    
    result = subprocess.run(
        [sys.executable, script_path],
        cwd=SCRIPTS_DIR,
        # Stream output in real-time
        stdout=None,
        stderr=None
    )
    
    elapsed = time.time() - start_time
    
    if result.returncode != 0:
        print(f"\n❌ Step {step_num} FAILED (exit code {result.returncode}) after {elapsed:.1f}s")
        return False
    
    print(f"\n✅ Step {step_num} completed in {elapsed:.1f}s")
    return True


def main():
    pipeline_start = time.time()
    
    print("=" * 70)
    print("  STOCK WISELY - 5-YEAR LSTM RETRAINING PIPELINE")
    print("=" * 70)
    print(f"\nStarted at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nPipeline steps:")
    print("  1. Import 5 years of sales data (2078-2082 BS)")
    print("  2a. Smart categorize products")
    print("  2b. Final Nepali categorization pass")
    print("  3. Extract sales data from database")
    print("  4. Prepare features (lags, rolling, temporal)")
    print("  5. Train LSTM model (2-layer, timesteps=3)")
    
    steps = [
        (1,  "Import 5-Year Sales Data",        "import_5year_sales.py"),
        ("2a", "Smart Product Categorization",   "smart_categorize_products.py"),
        ("2b", "Final Nepali Categorization",    "final_nepali_categorize.py"),
        (3,  "Extract Sales Data",               "extract_data.py"),
        (4,  "Prepare Features",                 "prepare_features.py"),
        (5,  "Train LSTM Model",                 "train_and_save_lstm.py"),
    ]
    
    results = []
    
    for step_num, description, script in steps:
        success = run_step(step_num, description, script)
        results.append((step_num, description, success))
        
        if not success:
            print(f"\n⚠️  Pipeline stopped at step {step_num}.")
            print("Fix the error and re-run this script to continue.")
            break
    
    # Final summary
    pipeline_elapsed = time.time() - pipeline_start
    
    print("\n" + "=" * 70)
    print("  PIPELINE SUMMARY")
    print("=" * 70)
    print(f"\n{'Step':<6} {'Description':<40} {'Status':<10}")
    print("-" * 56)
    for step_num, description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{str(step_num):<6} {description:<40} {status}")
    
    all_passed = all(s for _, _, s in results)
    
    print(f"\nTotal time: {pipeline_elapsed:.1f}s ({pipeline_elapsed/60:.1f} minutes)")
    
    if all_passed:
        print("\n" + "=" * 70)
        print("  ✅ ALL STEPS COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Review model metrics in lstm_model_metadata.json")
        print("  2. Restart forecast_server.py to use the new model:")
        print("     python forecast_server.py")
    else:
        print("\n❌ Pipeline did not complete. Check errors above.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
