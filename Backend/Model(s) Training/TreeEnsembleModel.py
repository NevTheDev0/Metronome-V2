import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.ensemble import RandomForestClassifier


# Load dataset
df = pd.read_csv("TrainData")

# Features + labels
X = df.drop(columns=["label"])
y = df["label"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)


#Initialize/Start model
model = RandomForestClassifier(
    n_estimators=100,  # number of trees
    max_depth=None,  # make it grow fully
    random_state=42,  #
    class_weight="balanced",  # balances dataset
)

#Train the model
model.fit(X_train, y_train)

#Evaluate the model
y_pred = model.predict(X_test)

#metrics
accuracy = accuracy_score(y_test, y_pred)
conf_matrix = confusion_matrix(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(accuracy)
print(conf_matrix)
print(f1)


#Get feature importances
importances = model.feature_importances_
features = X.columns

#Sort indices
indices = np.argsort(importances)[::-1]

#Print top 10
print("Top 10 features:")
for i in range(10):
    print(f"{features[indices[i]]}: {importances[indices[i]]:.4f}")

#Plot
plt.figure(figsize=(10, 6))
plt.bar(range(10), importances[indices[:10]], align="center")
plt.xticks(range(10), [features[i] for i in indices[:10]], rotation=45, ha="right")
plt.title("Top 10 Feature Importances (Random Forest)")
plt.tight_layout()
plt.show()
