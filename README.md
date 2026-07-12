# AI Travel Planner using IBM watsonx.ai

Roamly AI is a complete, responsive travel planning application created for an IBM SkillsBuild / AICTE internship submission. Travelers enter a destination, trip length, budget, group type, interests, food preference, and transportation style. IBM watsonx.ai then returns a structured day-wise itinerary with attractions, hotel ideas, food suggestions, cost guidance, packing reminders, safety tips, and travel advice.

The repository supports two beginner-friendly workflows:

- **Flask locally:** Jinja templates and the Python watsonx service run with `python app.py`.

## Key technologies

- HTML5, CSS3, JavaScript, Bootstrap 5, and Bootstrap Icons
- Python 3 and Flask
- IBM watsonx.ai with IBM Granite or compatible Llama models

## Project structure

```text
.
├── app.py                     # Flask application and local API
├── services/ibm_granite.py    # IBM watsonx.ai Python integration
├── templates/                 # Flask/Jinja pages
├── static/                    # Shared CSS and JavaScript
├── public/                    # Netlify-ready static pages
├── netlify/functions/         # Deployed API endpoints
├── netlify/database/          # Database migration
├── db/                        # Drizzle schema and database client
├── generate_static.py         # Dependency-free static page renderer
├── requirements.txt
├── package.json
└── netlify.toml
```

## Local Flask setup

1. Create and activate a virtual environment.
2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and add your IBM Cloud values.
4. Load the environment variables, then run:

   ```bash
   python app.py
   ```

5. Open `http://localhost:5000`.

Without watsonx credentials, the planner intentionally returns a polished demo itinerary so the full interface remains usable during review.

## IBM watsonx.ai configuration

Create a watsonx.ai project and set these environment variables locally and in Netlify:

- `WATSONX_API_KEY` — IBM Cloud API key
- `WATSONX_PROJECT_ID` — watsonx.ai project ID
- `WATSONX_URL` — regional service URL, such as `https://us-south.ml.cloud.ibm.com`
- `WATSONX_MODEL_ID` — foundation model ID; defaults to `ibm/granite-3-8b-instruct`
- `FLASK_SECRET_KEY` — random value used by local Flask

Never commit the real `.env` file.

## Netlify deployment

The site is configured through `netlify.toml`. Netlify publishes `public/`, deploys the functions in `netlify/functions/`, and automatically applies the migration in `netlify/database/migrations/`.

When Jinja templates or shared assets change, refresh the static deployment copy with:

```bash
python generate_static.py
rm -rf public/static && cp -R static public/static
```

Netlify Database stores generated travel plans. If the database is temporarily unavailable, itinerary generation still succeeds and only persistence is skipped.

## Features

- Eight complete screens: home, login, register, dashboard, planner, result, about, and contact
- Responsive editorial travel design with accessible forms
- IBM watsonx.ai itinerary generation and demo fallback
- Day-wise schedule, stays, food, budget, packing, safety, transport, and advice
- Loading state, dark mode, PDF download, copy, and print
- Form validation, Netlify Identity signup/login/recovery, saved-plan dashboard
- Mobile layouts and reduced-clutter print styling

## Important note

AI-generated travel information can become outdated. Travelers should verify prices, opening hours, visa requirements, health guidance, weather, and local safety information with official sources before booking.
