import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
# import the thing
from sklearn.ensemble import RandomForestClassifier
import matplotlib.pyplot as plt
import numpy as np

# Load your processed dataset
df = pd.read_csv("your_output_path.csv")

# Features + labels
X = df.drop(columns=["label"])
y = df["label"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)


# step 1: initialize model
model = RandomForestClassifier(
    n_estimators=100,  # number of trees
    max_depth=None,  # let it grow full unless you need to regularize
    random_state=42,  # reproducibility
    class_weight="balanced",  # helps with imbalanced hits vs non-hits
)

# step 2: train it
model.fit(X_train, y_train)

# step 3: evaluate
y_pred = model.predict(X_test)

# metrics
accuracy = accuracy_score(y_test, y_pred)
conf_matrix = confusion_matrix(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(accuracy)
print(conf_matrix)
print(f1)


# Get feature importances
importances = model.feature_importances_
features = X.columns

# Sort indices
indices = np.argsort(importances)[::-1]

# Print top 10
print("Top 10 features:")
for i in range(10):
    print(f"{features[indices[i]]}: {importances[indices[i]]:.4f}")

# Plot
plt.figure(figsize=(10, 6))
plt.bar(range(10), importances[indices[:10]], align="center")
plt.xticks(range(10), [features[i] for i in indices[:10]], rotation=45, ha="right")
plt.title("Top 10 Feature Importances (Random Forest)")
plt.tight_layout()
plt.show()
