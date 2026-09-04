import json
from pathlib import Path

import numpy as np
from PIL import Image


# Project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Model files
MODEL_PATH = PROJECT_ROOT / "model" / "smartwaste_mobilenetv2.keras"
CLASS_NAMES_PATH = PROJECT_ROOT / "model" / "class_names.json"

IMG_SIZE = (224, 224)


def load_class_names():
    """Load the waste-class mapping."""
    with open(CLASS_NAMES_PATH, "r") as f:
        return json.load(f)


def preprocess_image(image: Image.Image):
    """Prepare an image for MobileNetV2 inference."""

    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)

    image_array = np.array(image, dtype=np.float32)

    # MobileNetV2 preprocess_input:
    # scales pixels from [0, 255] to [-1, 1]
    image_array = (image_array / 127.5) - 1.0

    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)

    return image_array


def predict_image(image: Image.Image, model):
    """Run prediction and return class + confidence."""

    image_array = preprocess_image(image)

    predictions = model.predict(image_array, verbose=0)

    predicted_index = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][predicted_index])

    class_names = load_class_names()
    predicted_class = class_names[predicted_index]

    return {
        "class": predicted_class,
        "confidence": confidence
    }