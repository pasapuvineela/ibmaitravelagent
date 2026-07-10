"""Flask development server for the AI Travel Planner."""

from __future__ import annotations

import os
from datetime import datetime

from flask import Flask, jsonify, render_template, request

from services.ibm_granite import WatsonxTravelService

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "development-only-secret")
planner_service = WatsonxTravelService()


@app.context_processor
def inject_globals():
    return {"current_year": datetime.now().year}


@app.get("/")
def home():
    return render_template("index.html", active_page="home")


@app.get("/login")
def login():
    return render_template("login.html", active_page="login")


@app.get("/register")
def register():
    return render_template("register.html", active_page="register")


@app.get("/dashboard")
def dashboard():
    return render_template("dashboard.html", active_page="dashboard")


@app.get("/planner")
def planner():
    return render_template("planner.html", active_page="planner")


@app.get("/result")
def result():
    return render_template("result.html", active_page="planner")


@app.get("/about")
def about():
    return render_template("about.html", active_page="about")


@app.get("/contact")
def contact():
    return render_template("contact.html", active_page="contact")


@app.post("/api/generate")
def generate_plan():
    try:
        preferences = request.get_json(force=True)
        return jsonify({"plan": planner_service.generate(preferences)})
    except Exception as error:
        return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
