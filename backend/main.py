from contextlib import asynccontextmanager
import io

import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image

from backend.inference import predict_image, MODEL_PATH


model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model

    print("Loading SmartWasteAI model...")
    model = tf.keras.models.load_model(MODEL_PATH)
    print("SmartWasteAI model loaded successfully.")

    yield

    print("Shutting down SmartWasteAI API.")


app = FastAPI(
    title="SmartWasteAI API",
    description="Cloud-based smart waste classification API",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/")
def root():
    return {
        "message": "SmartWasteAI API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file."
        )

    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image."
        )

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded."
        )

    result = predict_image(image, model)

    return {
        "filename": file.filename,
        "prediction": result["class"],
        "confidence": result["confidence"]
    }