from contextlib import asynccontextmanager
import io
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from backend.inference import predict_image, MODEL_PATH

DYNAMODB_TABLE = "SmartWastePredictions"
S3_BUCKET = "smartwasteai-images-602480250205-ap-south-1-an"
AWS_REGION = "ap-south-1"

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
predictions_table = dynamodb.Table(DYNAMODB_TABLE)
s3_client = boto3.client("s3", region_name=AWS_REGION)

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

origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "SmartWasteAI API is running"}


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

    # Generate unique ID
    prediction_id = str(uuid.uuid4())

    # Upload image to S3
    filename = file.filename or "unknown.jpg"
    s3_key = f"uploads/{prediction_id}_{filename}"

    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=contents,
        ContentType=file.content_type
    )

    # Run prediction
    result = predict_image(image, model)

    timestamp = datetime.now(timezone.utc).isoformat()

    # Store prediction in DynamoDB
    predictions_table.put_item(
        Item={
            "prediction_id": prediction_id,
            "filename": filename,
            "s3_key": s3_key,
            "prediction": result["class"],
            "confidence": Decimal(str(result["confidence"])),
            "timestamp": timestamp
        }
    )

    return {
        "prediction_id": prediction_id,
        "filename": filename,
        "s3_key": s3_key,
        "prediction": result["class"],
        "confidence": result["confidence"],
        "timestamp": timestamp
    }
