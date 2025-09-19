from flask import Flask, request, jsonify
from transformers import pipeline
from datetime import datetime
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Path to your local Hugging Face model folder
MODEL_PATH = os.path.join(os.getcwd(), "HuggingFace Model")

classifier = None

def load_classifier():
    global classifier
    if classifier is None:
        try:
            print("Loading Hugging Face model from local folder...")
            classifier = pipeline(
                "text-classification",
                model=MODEL_PATH,    # use local model folder
                tokenizer=MODEL_PATH,
                top_k=1
            )
            print("✅ Model loaded successfully from local folder.")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            classifier = None

# In-memory storage (for testing; replace with DB later)
diary_entries = []

@app.route("/add_entry", methods=["POST"])
def add_entry():
    data = request.json
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "Text is required!"}), 400

    # Make sure classifier is loaded
    if classifier is None:
        load_classifier()

    if classifier is None:
        return jsonify({"error": "Model not available, try again later."}), 500

    try:
        # Predict emotion
        prediction = classifier(text)[0][0]  # Get top prediction
        emotion = prediction["label"]
        score = prediction["score"]

        # Create diary entry
        entry = {
            "text": text,
            "emotion": emotion,
            "confidence": round(score, 2),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Store entry in memory (or use a database in production)
        diary_entries.append(entry)
        return jsonify(entry)

    except Exception as e:
        return jsonify({"error": f"Failed to classify text: {str(e)}"}), 500

@app.route("/get_entries", methods=["GET"])
def get_entries():
    return jsonify(diary_entries)

if __name__ == "__main__":
    load_classifier()  # Load the model when the app starts
    app.run(debug=True, port=5050)  # Running on port 5050
