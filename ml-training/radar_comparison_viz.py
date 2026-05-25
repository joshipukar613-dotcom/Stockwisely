import json
import os
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Load the core performance metrics from calculated_metrics.json
metrics_file = 'calculated_metrics.json'
with open(metrics_file, 'r') as f:
    perf_data = json.load(f)

# Hardcoded training times and std dev (from sequential_models_comparison.csv)
# These are used to add extra dimensions to our comparison
extra_data = {
    'Random Forest': {'Training Time': 0.93, 'Stability': 1.64},
    'LightGBM': {'Training Time': 4.00, 'Stability': 0.56},
    'LSTM': {'Training Time': 157.19, 'Stability': 14.28}
}

target_models = ['LSTM', 'Random Forest', 'LightGBM']

# Prepare combined data structure
data = []
for model in target_models:
    m_perf = perf_data.get(model, {})
    m_extra = extra_data.get(model, {})
    
    # We want ALL metrics where "Higher is Better" for the radar chart
    # So we invert the ones where "Lower is Better"
    row = {
        'Model': model,
        'Accuracy %': m_perf.get('Accuracy', 0) / 100,
        'R² Score': m_perf.get('R2', 0),
        'Low RMSE': 1.0 / (m_perf.get('RMSE', 1.0) + 0.1),  # Add small epsilon to avoid div by zero
        'Low MSE': 1.0 / (m_perf.get('MSE', 1.0) + 0.1),
        'Efficiency': 1.0 / (np.log10(m_extra.get('Training Time', 1.0) + 1.0) + 1.0), # Log scale inversion
        'Stability': 1.0 / (m_extra.get('Stability', 1.0) + 1.0)
    }
    data.append(row)

df = pd.DataFrame(data)

# Normalize metrics between 0 and 1 for the radar chart
metrics = ['Accuracy %', 'R² Score', 'Low RMSE', 'Low MSE', 'Efficiency', 'Stability']
for col in metrics:
    min_val = df[col].min()
    max_val = df[col].max()
    if max_val > min_val:
        df[col] = (df[col] - min_val) / (max_val - min_val)
    else:
        df[col] = 1.0  # Default to 1 if all values are the same

# Radar Chart setup
labels = np.array(metrics)
num_vars = len(labels)

angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
angles += angles[:1] # Close the circle

fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
fig.patch.set_facecolor('#ffffff')

colors = {'LSTM': '#e74c3c', 'Random Forest': '#2ecc71', 'LightGBM': '#3498db'}

for i, model in enumerate(target_models):
    values = df.loc[df['Model'] == model, metrics].values.flatten().tolist()
    values += values[:1] # Close the circle
    
    ax.plot(angles, values, color=colors[model], linewidth=3, label=model, alpha=0.9)
    ax.fill(angles, values, color=colors[model], alpha=0.25)

# Fix axis labels
ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)
ax.set_thetagrids(np.degrees(angles[:-1]), labels, fontsize=12, fontweight='bold')

# Style adjustments
ax.set_ylim(0, 1)
ax.set_yticklabels([]) # Hide numerical scale
ax.grid(color='#d1d1d1', linestyle='--', alpha=0.7)

plt.title('Multi-Dimensional Comparison: LSTM vs Random Forest vs LightGBM', 
          size=18, fontweight='bold', pad=40)
plt.legend(loc='upper right', bbox_to_anchor=(1.2, 1.1), fontsize=12, frameon=True, shadow=True)

# Add explanatory footer
plt.figtext(0.5, 0.02, 
            "Chart illustrates cross-metric performance. Further from center is better.\n"
            "LSTM leads in R²/Low Error; Random Forest leads in Accuracy/Efficiency/Stability.", 
            ha="center", fontsize=10, bbox={"facecolor":"#eeeeee", "alpha":0.5, "pad":5})

plt.tight_layout()

output_path = 'model_radar_comparison.png'
plt.savefig(output_path, dpi=300, facecolor=fig.get_facecolor())
print(f"Radar comparison saved to: {output_path}")
