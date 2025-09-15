from flask import Flask, jsonify, render_template
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # <-- Enable CORS for all routes

@app.route("/")
def home():
    return render_template("index.html")

# API route to fetch quotes
@app.route("/get_quote")
def get_quote():
    try:
        response = requests.get("https://zenquotes.io/api/random")
        if response.status_code == 200:
            data = response.json()
            return jsonify({"quote": data[0]["q"], "author": data[0]["a"]})
        else:
            return jsonify({"quote": "Stay positive!", "author": "Unknown"})
    except Exception:
        return jsonify({"quote": "Error fetching API, using local quote.", "author": "System"})

if __name__ == "__main__":
    app.run(debug=True, port=5001)