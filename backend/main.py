from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image
import io

app = FastAPI(
    title="SmartWasteAI API",
    description="Cloud-based smart waste classification API",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "SmartWasteAI API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accept a waste image and prepare it for classification.
    """

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file."
        )

    # Read uploaded image
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents))
        image.verify()

        # Re-open after verify()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image."
        )

    return {
        "filename": file.filename,
        "message": "Image received successfully",
        "image_size": {
            "width": image.width,
            "height": image.height
        }
    }