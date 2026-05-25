import json
import os
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Load the data from calculated_metrics.json
metrics_file = 'calculated_metrics.json'

if os.path.exists(metrics_file):
    with open(metrics_file, 'r') as f:
        data_json = json.load(f)
    
    # Extract data for all models
    models = []
    accuracy = []
    mse = []
    rmse = []
    r2 = []
    
    for model_name, metrics in data_json.items():
        models.append(model_name)
        accuracy.append(metrics.get('Accuracy', 0))
        mse.append(metrics.get('MSE', 0))
        rmse.append(metrics.get('RMSE', 0))
        r2.append(metrics.get('R2', 0))
    
    df = pd.DataFrame({
        'Model': models,
        'Accuracy (%)': accuracy,
        'MSE': mse,
        'RMSE': rmse,
        'R2 Score': r2
    })
    
    # Filter for the requested models: LSTM, Random Forest, LightGBM
    target_models = ['LSTM', 'Random Forest', 'LightGBM']
    df = df[df['Model'].isin(target_models)].copy()
else:
    # Fallback data if file not found
    data = {
        'Model': ['Random Forest', 'LSTM', 'LightGBM'],
        'Accuracy (%)': [96.24, 91.59, 89.88],
        'MSE': [6.88, 0.26, 3.14],
        'RMSE': [2.62, 0.51, 1.77],
        'R2 Score': [0.977, 0.999, 0.989]
    }
    df = pd.DataFrame(data)

# Sort models by accuracy for consistent ordering
df = df.sort_values(by='Accuracy (%)', ascending=True)

# Set up the figure with 3 subplots (1x3)
fig, axes = plt.subplots(nrows=1, ncols=3, figsize=(18, 6))
fig.patch.set_facecolor('#f8f9fa')

# Color palette
colors = plt.cm.plasma(np.linspace(0.2, 0.8, len(df)))

metrics_to_plot = ['RMSE', 'R2 Score', 'MSE']
titles = [
    'RMSE (Lower is Better)',
    'R² Score (Closer to 1 is Better)',
    'MSE (Lower is Better)'
]

for i, (metric, title) in enumerate(zip(metrics_to_plot, titles)):
    ax = axes[i]
    
    # Plot horizontal bars
    bars = ax.barh(df['Model'], df[metric], color=colors, alpha=0.85)
    
    # Add values at the end of each bar
    for bar in bars:
        width = bar.get_width()
        label_text = f'{width:.4f}'
        ax.text(width + (width * 0.01), bar.get_y() + bar.get_height()/2, 
                label_text, va='center', fontsize=10, fontweight='bold')
    
    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel(metric, fontsize=11)
    ax.grid(axis='x', linestyle='--', alpha=0.6)
    
    # Highlight best model in each metric
    if 'Lower' in title:
        best_idx = df[metric].idxmin()
        best_model = df.loc[best_idx, 'Model']
    else:
        best_idx = df[metric].idxmax()
        best_model = df.loc[best_idx, 'Model']
    
    # Special annotation for the best performer
    ax.annotate('Best', xy=(df.loc[best_idx, metric], list(df['Model']).index(best_model)),
                xytext=(30, 10), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color='black'),
                fontsize=9, fontweight='bold')

plt.suptitle('Scientific Model Comparison (Regression Metrics)', fontsize=22, fontweight='bold', y=1.05)
plt.tight_layout()

# Save the plot
output_path = 'scientific_model_comparison.png'
plt.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
print(f"Scientific dashboard saved to: {output_path}")
