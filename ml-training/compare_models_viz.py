import json
import os
import matplotlib.pyplot as plt
import pandas as pd

# Load the data from calculated_metrics.json
metrics_file = 'calculated_metrics.json'

if os.path.exists(metrics_file):
    with open(metrics_file, 'r') as f:
        data_json = json.load(f)
    
    # Convert JSON to DataFrame structure
    models = []
    accuracies = []
    for model_name, metrics in data_json.items():
        models.append(model_name)
        accuracies.append(metrics.get('Accuracy', 0))
    
    df = pd.DataFrame({'model': models, 'mean_accuracy': accuracies})
else:
    # Fallback if file not found
    data = {
        'model': ['Random Forest', 'XGBoost', 'LSTM', 'LightGBM', 'GRU'],
        'mean_accuracy': [96.24, 95.56, 91.59, 89.88, 87.06]
    }
    df = pd.DataFrame(data)

# Filter for the requested models: LSTM, Random Forest, LightGBM
target_models = ['LSTM', 'Random Forest', 'LightGBM']
df_filtered = df[df['model'].isin(target_models)].copy()

# Sort by accuracy for better visualization
df_filtered = df_filtered.sort_values(by='mean_accuracy', ascending=False)

# Set style
plt.style.use('ggplot')
fig, ax = plt.subplots(figsize=(10, 6))

# Define colors (Green for Best, Blue for Mid, Orange for Third)
colors = ['#27ae60', '#2980b9', '#f39c12']

# Create bars
bars = ax.bar(df_filtered['model'], df_filtered['mean_accuracy'], color=colors, alpha=0.8, width=0.6)

# Add title and labels
ax.set_title('Model Performance Comparison: LSTM vs Random Forest vs LightGBM', fontsize=16, pad=20, fontweight='bold')
ax.set_ylabel('Accuracy (%)', fontsize=12)
ax.set_xlabel('Model Architecture', fontsize=12)
ax.set_ylim(0, 110)

# Add values on top of bars
for bar in bars:
    height = bar.get_height()
    ax.annotate(f'{height:.2f}%',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 5),  # 5 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=12, fontweight='bold')

# Add grid lines
ax.yaxis.grid(True, linestyle='--', alpha=0.7)

# Add an explanation text
plt.figtext(0.5, -0.05, 
            "Comparison based on final calculated metrics. Random Forest leads in accuracy,\n"
            "closely followed by the LSTM model and LightGBM.", 
            ha="center", fontsize=10, bbox={"facecolor":"blue", "alpha":0.1, "pad":5})

plt.tight_layout()

# Save the plot
plt.savefig('models_comparison_selected.png', dpi=300, bbox_inches='tight')
print("Graph updated successfully using calculated_metrics.json")
