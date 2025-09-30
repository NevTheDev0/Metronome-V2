import pandas as pd
import numpy as np

df = pd.read_csv("Metronome-V2\Backend\Data\Combined\merged_all.csv")

counts = df["target"].value_counts()

print(counts)
