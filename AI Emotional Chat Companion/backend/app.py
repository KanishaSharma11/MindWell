from flask import Flask, request, jsonify
from flask_cors import CORS
from textblob import TextBlob
import google.generativeai as genai
import requests

# ==========================
# 🔹 Flask Setup
# ==========================
app = Flask(__name__)
CORS(app, resources={r"/chat": {"origins": "http://127.0.0.1:3000"}})

# ==========================
# 🔹 Gemini Setup
# ==========================
GEMINI_API_KEY = "Gemini API"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-pro")

# ==========================
# 🔹 Google Search Setup
# ==========================
GOOGLE_API_KEY = "Google Search API"
SEARCH_ENGINE_ID = "5419cf93b9c7d4fa8"

def get_helplines(query="mental health suicide prevention helpline India"):
    """Fetch helpline info using Google Custom Search API"""
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_API_KEY,
        "cx": SEARCH_ENGINE_ID,
        "q": query
    }
    response = requests.get(url, params=params)
    results = response.json()

    helplines = []
    if "items" in results:
        for item in results["items"][:3]:  # take top 3 results
            helplines.append(f"- {item['title']}: {item['link']}")

    return "\n".join(helplines) if helplines else "No helplines found at the moment."


# ==========================
# 🔹 Sentiment Analysis
# ==========================
def analyze_sentiment(text):
    """Return positive, negative, or neutral"""
    polarity = TextBlob(text).sentiment.polarity
    if polarity > 0.2:
        return "positive"
    elif polarity < -0.2:
        return "negative"
    else:
        return "neutral"


# ==========================
# 🔹 Forbidden Words
# ==========================
FORBIDDEN_WORDS = ["suicide", "kill myself", "die", "end my life", "self harm"]


# ==========================
# 🔹 Chat Route
# ==========================
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_msg = data.get("message", "")

    # 1. Check forbidden words (self-harm cases)
    for word in FORBIDDEN_WORDS:
        if word.lower() in user_msg.lower():
            system_prompt = (
                "You are a compassionate emotional support chatbot. "
                "The user has expressed self-harm or suicidal thoughts. "
                "Respond with empathy, acknowledge their feelings, and encourage them "
                "to talk to a trusted friend, family member, or a professional."
            )

            ai_response = model.generate_content([system_prompt, user_msg])

            # ✅ Fetch live helplines
            helplines = get_helplines("suicide prevention helpline India")

            return jsonify({
                "response": ai_response.text +
                            "\n\n📞 Here are some helplines you can reach out to:\n" +
                            helplines
            })

    # 2. Sentiment analysis (normal case)
    mood = analyze_sentiment(user_msg)

    # 3. Set emotional context
    system_prompt = "You are a caring emotional support chatbot acting as a friend who listens and provides support."
    if mood == "positive":
        system_prompt += " Reply with encouragement and share their happiness."
    elif mood == "negative":
        system_prompt += " Reply empathetically, gently comfort them, and if you detect distress, guide them toward help or trusted people."
    else:
        system_prompt += " Reply in a supportive and friendly manner."

    # 4. Ask Gemini
    response = model.generate_content([system_prompt, user_msg])

    return jsonify({"response": response.text})


# ==========================
# 🔹 Run Server
# ==========================
if __name__ == "__main__":
    app.run(debug=True, port=5000)
