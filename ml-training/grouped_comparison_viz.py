import json
import os
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Load Accuracy from calculated_metrics.json
metrics_file = 'calculated_metrics.json'
with open(metrics_file, 'r') as f:
    perf_data = json.load(f)

# Load Std Dev from sequential_models_comparison.csv
# Random Forest: 1.64, LightGBM: 0.56, LSTM: 14.28
std_devs = {
    'Random Forest': 1.64,
    'LightGBM': 0.56,
    'LSTM': 14.28
}

target_models = ['Random Forest', 'LightGBM', 'LSTM']

# Data preparation
accuracy_vals = [perf_data.get(m, {}).get('Accuracy', 0) for m in target_models]
std_dev_vals = [std_devs.get(m, 0) for m in target_models]

x = np.arange(len(target_models))
width = 0.35

fig, ax = plt.subplots(figsize=(12, 7))

# Create bars
rects1 = []
rects2 = []

for i, model in enumerate(target_models):
    if model == 'LightGBM':
        color1 = '#27ae60' # Green for Accuracy
        color2 = '#2ecc71' # Lighter Green for Std Dev
    else:
        color1 = '#3498db' # Blue for Accuracy
        color2 = '#f39c12' # Orange for Std Dev
    
    r1 = ax.bar(x[i] - width/2, accuracy_vals[i], width, color=color1, label='Accuracy (%)' if i == 0 else "")
    r2 = ax.bar(x[i] + width/2, std_dev_vals[i], width, color=color2, label='Std Dev (%)' if i == 0 else "")
    rects1.append(r1)
    rects2.append(r2)

# Legend (manual handling because of repetitive labels)
from matplotlib.lines import Line2D
legend_elements = [
    Line2D([0], [0], color='#3498db', lw=4, label='Accuracy (%)'),
    Line2D([0], [0], color='#f39c12', lw=4, label='Std Dev (%)'),
    Line2D([0], [0], color='#27ae60', lw=4, label='Highlighted (LightGBM)')
]
ax.legend(handles=legend_elements, loc='upper right')

# Labels and Titles
ax.set_ylabel('Percentage (%)', fontsize=12, fontweight='bold')
ax.set_title('Model Performance: Accuracy vs Stability (Std Dev)', fontsize=16, fontweight='bold', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(target_models, fontsize=12, fontweight='bold')
ax.set_ylim(0, 115)

# Value labels on top
def autolabel(rects_list):
    for rects in rects_list:
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.2f}%',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10, fontweight='bold')

autolabel(rects1)
autolabel(rects2)

plt.grid(axis='y', linestyle='--', alpha=0.6)
plt.tight_layout()

# Save the plot
output_path = 'grouped_performance_comparison.png'
plt.savefig(output_path, dpi=300)
print(f"Grouped bar chart saved to: {output_path}")
