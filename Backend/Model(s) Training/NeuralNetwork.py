import tensorflow as tf
from tensorflow import keras
from keras import models,layers
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from keras import Sequential
from keras.layers import Dense
from keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_curve, confusion_matrix, f1_score, classification_report
from sklearn.dummy import DummyClassifier
from sklearn.utils.class_weight import compute_class_weight


df = pd.read_csv(r"Metronome-V2\Backend\Data\Fix_TrainData2.csv")
X = df.drop(columns=["label"])
y = df["label"]
WINDOW_SIZE = 5
NUM_FEATURES = 14


''''''
# Window function
def make_windows(X, y, window_size, flatten=True):
    X_windowed, y_windowed = [], []
    num_features = X.shape[1]

    for i in range(window_size, len(X)):
        window = X.iloc[i - window_size : i].to_numpy()
        label = y.iloc[i]

        if flatten:
            window = np.reshape(window, (window_size * num_features,))

        X_windowed.append(window)
        y_windowed.append(label)

    return np.array(X_windowed), np.array(y_windowed)

X_windowed, y_windowed = make_windows(X, y, WINDOW_SIZE, flatten=True)

class_weights = compute_class_weight(
    class_weight="balanced", classes=np.unique(y_windowed), y=y_windowed
)
class_weight_dict = {i: w for i, w in enumerate(class_weights)}

# Split Windowed data
X_train, X_test, y_train, y_test = train_test_split(
    X_windowed, y_windowed, test_size=0.2, random_state=42, stratify=y_windowed
)


# Build model
MLP = Sequential()
MLP.add(Dense(128, activation="relu", input_shape=(X_train.shape[1],)))
MLP.add(Dense(64, activation="relu"))
MLP.add(Dense(1, activation="sigmoid"))

# Compile the model
MLP.compile(optimizer="Adam", loss="binary_crossentropy", metrics=["accuracy"])

# Train
MLP.fit(
    X_train,
    y_train,
    epochs=20,
    batch_size=32,
    validation_split=0.2,
    class_weight=class_weight_dict,
)

metrics = MLP.evaluate(X_test, y_test)
print(metrics)

y_pred_probs = MLP.predict(X_test)

for t in [0.3,0.4,0.5,0.6,0.7]:
    y_pred = (y_pred_probs > t).astype(int)
    print(confusion_matrix(y_test, y_pred))
    print(classification_report(y_test, y_pred))

precisions, recalls, thresholds = precision_recall_curve(y_test, y_pred_probs)
plt.figure(figsize=(7, 6))
plt.plot(recalls, precisions, label="PR Curve", linewidth=2)

for t in [0.3, 0.4, 0.5, 0.6, 0.7]:
    idx = np.argmin(np.abs(thresholds - t))  # closest threshold index
    plt.scatter(recalls[idx], precisions[idx], label=f"t={t}", s=70)

# Random baseline (always predicting positive = proportion of positives in test set)
baseline = np.sum(y_test) / len(y_test)
plt.hlines(
    y=baseline,
    xmin=0,
    xmax=1,
    colors="red",
    linestyles="dashed",
    label=f"Baseline (pos rate={baseline:.2f})",
)

plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve with Threshold Points")
plt.legend()
plt.grid(True)
plt.show()


# y_pred_classes = (y_pred_probs > 0.4).astype(int)

dummy = DummyClassifier(strategy="most_frequent")
dummy.fit(X_train, y_train)
print("Baseline acc:", dummy.score(X_test, y_test))

MLP.save("hit_predictor.keras")
