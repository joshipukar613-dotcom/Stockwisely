import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Data for Variance (Stability) Analysis
# Random Forest: 1.64%, LightGBM: 0.56%, LSTM: 14.28%
data = {
    'Model': ['LightGBM', 'Random Forest', 'LSTM'],
    'Std Dev (%)': [0.56, 1.64, 14.28]
}

df = pd.DataFrame(data)

# Set style
plt.style.use('ggplot')
fig, ax = plt.subplots(figsize=(10, 6))
fig.patch.set_facecolor('#ffffff')

# Colors: Green for low variance (stable), Red for high variance (unstable)
# We'll use a gradient based on the values
colors = ['#27ae60', '#f39c12', '#e74c3c']

# Create bar chart
bars = ax.bar(df['Model'], df['Std Dev (%)'], color=colors, alpha=0.8, width=0.6)

# Add title and labels
ax.set_title('Model Stability Comparison (Variance / Std Dev)', fontsize=16, fontweight='bold', pad=20)
ax.set_ylabel('Standard Deviation (%)', fontsize=12, fontweight='bold')
ax.set_xlabel('Model Architecture', fontsize=12, fontweight='bold')

# Add value labels on top of bars
for bar in bars:
    height = bar.get_height()
    ax.annotate(f'±{height:.2f}%',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 5), 
                textcoords="offset points",
                ha='center', va='bottom', fontsize=12, fontweight='bold')

# Highlight that lower is better
ax.text(0.5, 0.95, 'LOWER VALUE = MORE STABLE MODEL', 
        transform=ax.transAxes, ha='center', fontsize=10, 
        fontweight='bold', color='#2c3e50', bbox=dict(boxstyle="round,pad=0.3", fc="#ecf0f1", ec="#bdc3c7", alpha=0.8))

# Grid and Layout
ax.yaxis.grid(True, linestyle='--', alpha=0.7)
plt.tight_layout()

# Save the plot
output_path = 'model_stability_variance.png'
plt.savefig(output_path, dpi=300)
print(f"Variance chart saved to: {output_path}")
