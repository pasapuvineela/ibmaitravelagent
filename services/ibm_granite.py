"""IBM watsonx.ai integration and deterministic demo fallback."""

from __future__ import annotations

import json
import os
from typing import Any

import requests


class WatsonxTravelService:
    """Generate structured travel plans with IBM watsonx.ai."""

    def __init__(self) -> None:
        self.api_key = os.getenv("WATSONX_API_KEY", "")
        self.project_id = os.getenv("WATSONX_PROJECT_ID", "")
        self.region_url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com").rstrip("/")
        self.model_id = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def generate(self, preferences: dict[str, Any]) -> dict[str, Any]:
        if not self.configured:
            return self.demo_plan(preferences)

        token_response = requests.post(
            "https://iam.cloud.ibm.com/identity/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": self.api_key,
            },
            timeout=30,
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]

        response = requests.post(
            f"{self.region_url}/ml/v1/text/generation?version=2024-05-31",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={
                "model_id": self.model_id,
                "project_id": self.project_id,
                "input": self._prompt(preferences),
                "parameters": {
                    "decoding_method": "greedy",
                    "max_new_tokens": 2400,
                    "repetition_penalty": 1.08,
                },
            },
            timeout=120,
        )
        response.raise_for_status()
        generated_text = response.json()["results"][0]["generated_text"]
        return self._parse_json(generated_text)

    def _prompt(self, preferences: dict[str, Any]) -> str:
        return f"""You are an expert travel planner. Create a realistic, safe itinerary using the exact JSON schema below.
Return JSON only, without markdown fences or commentary.

Traveler preferences:
{json.dumps(preferences, indent=2)}

Schema:
{{
  "trip_title": "string",
  "summary": "string",
  "best_time": "string",
  "estimated_budget": {{"total": "string", "breakdown": [{{"label": "string", "amount": "string"}}]}},
  "days": [{{"day": 1, "title": "string", "morning": "string", "afternoon": "string", "evening": "string", "food": "string", "estimated_cost": "string"}}],
  "attractions": [{{"name": "string", "description": "string"}}],
  "hotels": [{{"name": "string", "area": "string", "price_range": "string", "why": "string"}}],
  "foods": [{{"name": "string", "description": "string"}}],
  "packing": ["string"],
  "safety": ["string"],
  "transport": ["string"],
  "advice": ["string"]
}}
"""

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end < 0:
            raise ValueError("watsonx.ai returned an unexpected response.")
        return json.loads(text[start : end + 1])

    @staticmethod
    def demo_plan(preferences: dict[str, Any]) -> dict[str, Any]:
        destination = preferences.get("destination", "Jaipur")
        days = max(1, min(int(preferences.get("days", 3)), 14))
        activities = preferences.get("activities") or ["culture", "local food"]
        if isinstance(activities, str):
            activities = [item.strip() for item in activities.split(",") if item.strip()]
        daily = []
        themes = [
            ("Signature sights", "Explore a landmark district and orient yourself with a guided walk."),
            ("Culture & craft", "Visit a museum, heritage quarter, or artisan workshop."),
            ("Nature & neighborhoods", "Slow down in a garden, waterfront, or scenic local neighborhood."),
            ("Hidden gems", "Discover a quieter attraction and browse a local market."),
        ]
        for index in range(days):
            title, afternoon = themes[index % len(themes)]
            daily.append({
                "day": index + 1,
                "title": title,
                "morning": f"Start with a relaxed breakfast, then visit one of {destination}'s essential landmarks before peak crowds.",
                "afternoon": afternoon,
                "evening": "Enjoy a sunset viewpoint or a relaxed neighborhood stroll followed by dinner.",
                "food": f"Choose a well-reviewed local restaurant with {preferences.get('food', 'flexible')} options.",
                "estimated_cost": "₹2,500–₹5,500 per person",
            })
        return {
            "trip_title": f"{days}-Day {destination} Discovery",
            "summary": f"A balanced {preferences.get('travel_type', 'leisure')} journey blending {', '.join(activities[:3])}, local flavors, and practical downtime.",
            "best_time": "Plan for the destination's shoulder season when weather is comfortable and major attractions are less crowded.",
            "estimated_budget": {
                "total": preferences.get("budget", "₹35,000–₹55,000"),
                "breakdown": [
                    {"label": "Stay", "amount": "40%"},
                    {"label": "Food", "amount": "22%"},
                    {"label": "Local travel", "amount": "18%"},
                    {"label": "Experiences", "amount": "20%"},
                ],
            },
            "days": daily,
            "attractions": [
                {"name": "Historic core", "description": "Architecture, stories, and lively street scenes in the heart of the destination."},
                {"name": "Local market", "description": "A good place for crafts, regional snacks, and everyday culture."},
                {"name": "Scenic viewpoint", "description": "A memorable panorama, especially around golden hour."},
            ],
            "hotels": [
                {"name": "Central boutique stay", "area": "City center", "price_range": "Mid-range", "why": "Walkable access and easy evening dining."},
                {"name": "Quiet neighborhood hotel", "area": "Residential district", "price_range": "Value", "why": "Calmer nights and an authentic local feel."},
                {"name": "Heritage or design hotel", "area": "Historic quarter", "price_range": "Premium", "why": "A distinctive stay for a special trip."},
            ],
            "foods": [
                {"name": "Regional breakfast", "description": "Try a popular local morning specialty from a busy, trusted vendor."},
                {"name": "Traditional thali or tasting plate", "description": "Sample several regional dishes in one meal."},
                {"name": "Local sweet or dessert", "description": "Finish an evening with a destination-specific treat."},
            ],
            "packing": ["Comfortable walking shoes", "Reusable water bottle", "Light layers", "Power bank", "Sun protection", "Small day bag", "Personal medicines"],
            "safety": ["Keep digital copies of key documents.", "Use licensed transport or trusted ride apps.", "Confirm opening hours and local advisories before leaving.", "Carry only the cash needed for the day."],
            "transport": [f"Primary preference: {preferences.get('transport', 'public transport and walking')}", "Group nearby attractions to reduce travel time.", "Allow extra time during rush hours and festival periods."],
            "advice": ["Reserve popular experiences in advance.", "Keep one flexible block for weather or discoveries.", "Ask before photographing people or religious spaces.", "Choose travel insurance appropriate to your trip."],
            "demo_mode": True,
        }
