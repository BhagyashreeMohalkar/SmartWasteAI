# ♻️ SmartWasteAI

SmartWasteAI is a cloud-based deep learning system that classifies waste images into 10 categories and helps automate recycling and disposal decisions. It combines a MobileNetV2 image classifier served through a FastAPI backend, with AWS-backed storage and logging, and a lightweight web frontend for image upload and results.

## ✨ Features

- 📸 Upload a waste image and get an instant category prediction with confidence score
- 🧠 Transfer-learning image classifier (MobileNetV2) trained on 10 waste classes
- ☁️ Predicted images stored in Amazon S3, prediction metadata logged in DynamoDB
- 🚀 Dockerized FastAPI backend, deployed on AWS EC2
- 🌐 Static frontend (HTML/CSS/JS) deployed on Vercel, calling the live API
- 🩺 Health-check endpoint for monitoring model/API status

## 🧠 Machine Learning

- **Dataset**: Garbage classification dataset (Kaggle), cleaned/enhanced, with 10 classes — `battery`, `biological`, `brown-glass`, `cardboard`, `green-glass`, `metal`, `paper`, `plastic`, `trash`, `white-glass`
- **Models compared**: a custom baseline CNN and transfer learning with **MobileNetV2** (ImageNet weights)
- **Training approach**: MobileNetV2 base with a GlobalAveragePooling + Dense classification head, trained in two stages (frozen base, then fine-tuning) using data augmentation, `EarlyStopping`, and `ReduceLROnPlateau`, in Google Colab
- **Deployed model**: `smartwaste_mobilenetv2_v2.keras` (final fine-tuned MobileNetV2), input size 224×224

## ☁️ Cloud Architecture

```
User → Frontend (Vercel, HTML/CSS/JS)
         │
         ▼
   FastAPI Backend (Docker, AWS EC2)
         │
         ├──► MobileNetV2 model → prediction + confidence
         ├──► Amazon S3 → stores uploaded image
         └──► Amazon DynamoDB → stores prediction record
```

## 🛠️ Tech Stack

**Deep Learning**
- Python, TensorFlow / Keras, MobileNetV2, Scikit-learn (metrics)

**Backend**
- FastAPI, Uvicorn, Pillow, NumPy, Boto3

**Cloud**
- AWS EC2 (API hosting), Amazon S3 (image storage), Amazon DynamoDB (prediction records)

**Frontend**
- HTML, CSS, JavaScript

**Deployment / Tools**
- Docker, Vercel (frontend hosting), Google Colab (model training), Git/GitHub

## 📁 Project Structure

```
SmartWasteAI/
├── backend/
│   ├── main.py          # FastAPI app: /predict, /health routes, S3 + DynamoDB integration
│   └── inference.py     # Image preprocessing and model inference
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js        # Upload UI, calls the FastAPI /predict endpoint
│   └── vercel.json       # Proxies /api requests to the EC2-hosted backend
├── SmartWasteAI_01_EDA.ipynb   # Dataset EDA + model training/evaluation notebook
├── Dockerfile
└── requirements.txt
```

## 🚀 How It Works

1. User uploads a waste image through the web frontend
2. The frontend sends the image to the FastAPI `/predict` endpoint
3. The backend uploads the image to an S3 bucket
4. The image is preprocessed and passed to the MobileNetV2 model for classification
5. The predicted class, confidence score, and metadata are saved to DynamoDB
6. The prediction result is returned to the frontend and displayed to the user

## 📊 Results

Final deployed model — MobileNetV2 (fine-tuned), evaluated on the held-out test set:

| Metric | Score |
|---|---|
| Test Accuracy | 92.54% |
| Macro Precision | 92.54% |
| Macro Recall | 92.36% |
| Macro F1-score | 92.41% |
| Weighted F1-score | 92.57% |

## 🚀 Development Steps

📊 **Dataset Preparation & EDA** — Cleaned, explored, and prepared the waste image dataset.
🧠 **Model Development** — Built a baseline CNN and compared it with MobileNetV2 transfer learning.
🎯 **Model Fine-Tuning** — Fine-tuned MobileNetV2 and evaluated its performance.
⚙️ **Backend Development** — Built a FastAPI inference API and integrated S3 and DynamoDB.
🐳 **Cloud Deployment** — Dockerized the backend and deployed it on AWS EC2.
🌐 **Frontend Development** — Built the web interface and deployed it using Vercel.
☁️ **Cloud Integration** — Connected cloud storage, database, and AI inference into the application.

## 🌍 Vision

SmartWasteAI aims to make waste sorting smarter and more accessible by pairing practical deep learning with a simple, cloud-hosted experience.
