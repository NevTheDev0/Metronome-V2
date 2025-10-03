from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from collections import deque
import numpy as np
import tensorflow as tf
from typing import Optional
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load model with error handling
try:
    BASE_DIR = Path(__file__).resolve().parent
    MODEL_PATH = BASE_DIR / "Models" / "hit_predictor2.keras"
    model = tf.keras.models.load_model(str(MODEL_PATH))
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request schema with validation
class Frame(BaseModel):
    timestamp: float = Field(..., gt=0)
    left_wrist_x: Optional[float] = Field(None, ge=0, le=1)
    left_wrist_y: Optional[float] = Field(None, ge=0, le=1)
    left_wrist_z: Optional[float] = None
    left_wrist_velocity: Optional[float] = Field(None, ge=0)
    left_wrist_acceleration: Optional[float] = None
    right_wrist_x: Optional[float] = Field(None, ge=0, le=1)
    right_wrist_y: Optional[float] = Field(None, ge=0, le=1)
    right_wrist_z: Optional[float] = None
    right_wrist_velocity: Optional[float] = Field(None, ge=0)
    right_wrist_acceleration: Optional[float] = None


# Buffers
frame_buffer = deque(maxlen=5)
left_y_history = deque(maxlen=50)
right_y_history = deque(maxlen=50)

# Stats
prediction_count = 0
hit_prediction_count = 0

WINDOW_SIZE = 5
NUM_FEATURES = 14  # per frame


@app.get("/")
def root():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "predictions_made": prediction_count,
        "hits_predicted": hit_prediction_count,
        "buffer_size": len(frame_buffer),
    }


@app.post("/predict")
def predict(frame: Frame):
    global prediction_count, hit_prediction_count

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Add frame to buffer
        frame_dict = frame.model_dump()
        frame_buffer.append(frame_dict)
        left_y_history.append(frame.left_wrist_y or 0)
        right_y_history.append(frame.right_wrist_y or 0)

        # Wait for full window
        if len(frame_buffer) < WINDOW_SIZE:
            return {
                "probability": None,
                "predicted_class": None,
                "status": "warming_up",
                "frames_needed": WINDOW_SIZE - len(frame_buffer),
            }

        window_frames = list(frame_buffer)[-WINDOW_SIZE:]

        # Rolling mean helper (handles None)
        def safe_mean(key, frames):
            vals = [(f[key] if f[key] is not None else 0) for f in frames]
            return np.mean(vals[-3:])

        vel_l_smooth = safe_mean("left_wrist_velocity", window_frames)
        acc_l_smooth = safe_mean("left_wrist_acceleration", window_frames)
        vel_r_smooth = safe_mean("right_wrist_velocity", window_frames)
        acc_r_smooth = safe_mean("right_wrist_acceleration", window_frames)

        features = []

        # Build 14D per frame
        for i, f in enumerate(window_frames):
            prev = window_frames[i - 1] if i > 0 else f

            dx_l = (f["left_wrist_x"] or 0) - (prev["left_wrist_x"] or 0)
            dy_l = (f["left_wrist_y"] or 0) - (prev["left_wrist_y"] or 0)
            dz_l = (f["left_wrist_z"] or 0) - (prev["left_wrist_z"] or 0)

            dx_r = (f["right_wrist_x"] or 0) - (prev["right_wrist_x"] or 0)
            dy_r = (f["right_wrist_y"] or 0) - (prev["right_wrist_y"] or 0)
            dz_r = (f["right_wrist_z"] or 0) - (prev["right_wrist_z"] or 0)

            l_y_norm = (f["left_wrist_y"] or 0) - np.mean(left_y_history)
            r_y_norm = (f["right_wrist_y"] or 0) - np.mean(right_y_history)

            trend_l = np.mean([(fr["left_wrist_y"] or 0) for fr in window_frames][-3:])
            trend_r = np.mean([(fr["right_wrist_y"] or 0) for fr in window_frames][-3:])

            features.extend(
                [
                    dx_l,
                    dy_l,
                    dz_l,
                    vel_l_smooth,
                    acc_l_smooth,
                    l_y_norm,
                    trend_l,
                    dx_r,
                    dy_r,
                    dz_r,
                    vel_r_smooth,
                    acc_r_smooth,
                    r_y_norm,
                    trend_r,
                ]
            )

        features = np.array(features).reshape(1, -1)  # (1, 70)

        y_pred_prob = float(model.predict(features, verbose=0)[0][0])
        y_pred_class = int(y_pred_prob > 0.5 )

        prediction_count += 1
        if y_pred_class == 1:
            hit_prediction_count += 1
            logger.info(f"HIT predicted with {y_pred_prob:.3f} confidence")

        return {
            "probability": y_pred_prob,
            "predicted_class": y_pred_class,
            "status": "success",
            "confidence": (
                "high" if y_pred_prob > 0.8 or y_pred_prob < 0.2 else "medium"
            ),
        }

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/reset")
def reset_buffers():
    """Reset all buffers - useful when starting a new session"""
    frame_buffer.clear()
    left_y_history.clear()
    right_y_history.clear()
    global prediction_count, hit_prediction_count
    prediction_count = 0
    hit_prediction_count = 0
    return {"status": "buffers_reset"}
