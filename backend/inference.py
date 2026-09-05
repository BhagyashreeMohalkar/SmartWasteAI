import json
from pathlib import Path

import numpy as np
from PIL import Image


MODEL_PATH = Path("/app/model/smartwaste_mobilenetv2_v2.keras")
CLASS_NAMES_PATH = Path("/app/model/class_names.json")

IMG_SIZE = (224, 224)


def load_class_names():
    with open(CLASS_NAMES_PATH, "r") as f:
        return json.load(f)


def preprocess_image(image: Image.Image):
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)

    # Preprocessing is already included inside the exported model.
    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    return image_array


def predict_image(image: Image.Image, model):
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
