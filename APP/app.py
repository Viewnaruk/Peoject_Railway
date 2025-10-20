import uvicorn
from fastapi import FastAPI
from Reviews import Reviews
import numpy as np
import pickle
import pandas as pd
import re
from scipy.sparse import hstack
import joblib
from fastapi import HTTPException
import sklearn
import emoji
import google.generativeai as genai
from pymongo import MongoClient
from bson import ObjectId
from fastapi import Request
import os
import gdown

app = FastAPI()

client = MongoClient("mongodb+srv://sasipreyas:1234@cluster0.fwzmzgy.mongodb.net/")
db = client['Web_App_Tourist_Revm']
collection = db['Review']


# 🔹 Google Drive file IDs
# เปลี่ยนเป็น ID ของไฟล์คุณ
# -----------------------------
MODEL_ID = "1pbekIy74RNW4w5dmCMKbvvtia2kp5Chf"
VECTORIZER_ID = "1VBNElPcxYwXuVF7uxH-tq4kSrsOq4lZt"
EMOJI_ID = "1sVSv1GfhPaj2c_WZQklMaYJSx48LY_uR"

# -----------------------------
# 🔹 Path ในเครื่อง
# -----------------------------
os.makedirs("APP", exist_ok=True)
MODEL_PATH = "APP/sentiment_model.pkl"
VECTORIZER_PATH = "APP/vectorizer.pkl"
EMOJI_PATH = "APP/emoji_mapping.pkl"

# -----------------------------
# 🔹 ฟังก์ชันโหลดไฟล์จาก Google Drive
# -----------------------------
def download_if_missing(file_id, save_path):
    if not os.path.exists(save_path):
        print(f"📥 Downloading {save_path} from Google Drive...")
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, save_path, quiet=False)
    else:
        print(f"✅ Found {save_path}")

# -----------------------------
# 🔹 โหลดโมเดลตอน FastAPI startup
# -----------------------------
@app.on_event("startup")
def load_models():
    download_if_missing(MODEL_ID, MODEL_PATH)
    download_if_missing(VECTORIZER_ID, VECTORIZER_PATH)
    download_if_missing(EMOJI_ID, EMOJI_PATH)

    global classifier, vectorizer, emoji_mapping
    classifier = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    emoji_mapping = joblib.load(EMOJI_PATH)
    print("🎯 Models loaded successfully!")

# -----------------------------
# 🔹 ตัวอย่าง route ทดสอบ
# -----------------------------
@app.get("/")
def home():
    return {"message": "FastAPI is running and models are loaded!"}


# โหลดโมเดลที่บันทึกไว้
# classifier = joblib.load("sentiment_model.pkl")   # classifier ที่ train แล้ว
# vectorizer = joblib.load("vectorizer.pkl")       # vectorizer ที่ fit แล้ว
# emoji_mapping = joblib.load("emoji_mapping.pkl") # dict mapping emoji → int


# regex สำหรับจับ emoji
emoji_pattern = re.compile( "["
    u"\U0001F600-\U0001F64F"  # Emoticons
    u"\U0001F300-\U0001F5FF"  # Symbols & Pictographs
    u"\U0001F680-\U0001F6FF"  # Transport & Map
    u"\U0001F1E0-\U0001F1FF"  # Flags
    u"\U00002700-\U000027BF"  # Dingbats
    u"\U0001F900-\U0001F9FF"  # Supplemental Symbols & Pictographs
    u"\U0001FA70-\U0001FAFF"  # Symbols & Pictographs Extended-A
    u"\U00002600-\U000026FF"  # Miscellaneous Symbols
    u"\U00002300-\U000023FF"  # Miscellaneous Technical
    u"\U0000FE00-\U0000FE0F"  # Variation Selectors
    u"\U0001F1F2-\U0001F1F4"  # Macau flag etc.
    u"\U0001F1E6-\U0001F1FF"  # Regional Indicator Symbols
    "]", flags=re.UNICODE)

def extract_emoji(text: str):
    emojis = emoji_pattern.findall(text)
    clean_text = emoji_pattern.sub(r'', text)  # ลบ emoji ออกจากข้อความ
    return emojis, clean_text

def strip_aspect(aspect: str):
    return aspect.strip()

@app.post('/predict')
async def predict_reviews(request: Request):
    try:
        body = await request.json()
        Review = body.get("review")         # รับข้อความรีวิวตรงๆ
        category = body.get("category")     # รับ category ตรงๆ

        if not Review:
            raise HTTPException(status_code=400, detail="review is required")

        # 1) แยก emoji และทำความสะอาดข้อความ
        emojis, clean_review = extract_emoji(Review)

        # 2) แปลงข้อความ → vector
        X_text = vectorizer.transform([clean_review]).toarray()

        # 3) แปลง emoji → int แล้วบวกกัน
        emoji_label = sum([emoji_mapping.get(e, 0) for e in emojis])
        emoji_label_array = np.array([emoji_label]).reshape(-1, 1)

        # 4) รวม feature
        X_final = np.hstack([X_text, emoji_label_array])

        # 5) คำนวณ score
        score = classifier.decision_function(X_final)[0]
        
        print("Score:", score) # เพิ่มบรรทัดนี้เพื่อดูค่า score

        threshold = -0.5456117703308974
        sentiment = "Positive" if score > threshold else "Negative"

        genai.configure(api_key="AIzaSyBHCXD9hQhtNhWnMp1dkd_v9AvdLHD0GGk")
        model = genai.GenerativeModel("gemma-3-27b-it")
    

        # เลือก prompt ตาม category
        if category == "Religious Place":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Aesthetics, Scenery, Atmosphere, Spirituality, Location. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Nature":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Atmosphere, Cleanliness, Nature, Scenary, Aesthetics. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Museum":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Dinosaurs, Educational, Cleanliness, Family-friendly. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Zoos":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Animals, Price, Service, Cleanliness, Atmosphere. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Parks":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Atmosphere, Aesthetics, Relaxation, Exercise, Cleanliness, Weather. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Markets":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Food, Atmosphere, Price, Parking, Shopping. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "Homestay":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Service, Atmosphere, Cleanliness, Room, Food. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        elif category == "historic Site":
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories: Aesthetics, Atmosphere, History. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        else :
            prompt = f"""Analyze the following review text: '{Review}'. Your task is to classify the single most prominent aspect discussed in the text. You must respond with only one word, chosen from this exact list of categories:Desserts and drinks, Atmosphere, Service, Price. If the review content does not clearly and strongly align with any of these five options, respond with Other."""

        
        response = model.generate_content(prompt)
        aspect_stripped = strip_aspect(response.text)
        return {
            "review": Review,
            "sentiment": sentiment,
            "score": score,
            "emojis": emojis,
            "emoji_label": emoji_label,
            "Aspect": aspect_stripped,
            
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


  
    
    

print(sklearn.__version__)
    
# . Run the API with uvicorn
#    Will run on http://127.0.0.1:8080
if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=9000)

