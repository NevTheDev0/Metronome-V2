import numpy as np
import pandas as pd
import matplotlib

df = pd.read_csv(r"Metronome-V2\Backend\Data\TrainData2.csv")
window = 3

df = df.sort_values("timestamp_ms_relative")

df["left_wrist_height_norm"] = df["left_wrist_height"] - df["left_wrist_height"].mean()
df["right_wrist_height_norm"] = (
    df["right_wrist_height"] - df["right_wrist_height"].mean()
)

df["dx_left"] = df["left_wrist_x"].diff(1)
df["dy_left"] = df["left_wrist_y"].diff(1)
df["dz_left"] = df["left_wrist_z"].diff(1)

df["dx_right"] = df["right_wrist_x"].diff(1)
df["dy_right"] = df["right_wrist_y"].diff(1)
df["dz_right"] = df["right_wrist_z"].diff(1)

df["vel_left_smooth"] = df["left_wrist_velocity"].rolling(window).mean()
df["acc_left_smooth"] = df["left_wrist_acceleration"].rolling(window).mean()

df["trend_left_y"] = df["left_wrist_y"].rolling(window).mean()
df["vel_right_smooth"] = df["right_wrist_velocity"].rolling(window).mean()
df["acc_right_smooth"] = df["right_wrist_acceleration"].rolling(window).mean()
df["trend_right_y"] = df["right_wrist_y"].rolling(window).mean()

features = [
    "dx_left",
    "dy_left",
    "dz_left",
    "vel_left_smooth",
    "acc_left_smooth",
    "left_wrist_height_norm",
    "trend_left_y",
    "dx_right",
    "dy_right",
    "dz_right",
    "vel_right_smooth",  # fixed
    "acc_right_smooth",  # fixed
    "right_wrist_height_norm",
    "trend_right_y",
]
print(df.columns.tolist())

X = df[features]
y = df["target"]  # 0/1 hit label

X = X.dropna()
y = y.loc[X.index]

counts = df["target"].value_counts()

print(counts)

final_df = X.copy()
final_df["label"] = y
final_df.to_csv("output_path.csv", index=False)
