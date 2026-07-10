# Project Guidance

## Architecture

This repository intentionally supports both Flask and Netlify. `app.py`, `templates/`, `static/`, and `services/ibm_granite.py` form the local Python application. `public/`, `netlify/functions/`, and `db/` form the deployed Netlify application. Keep the planner payload and itinerary JSON schema compatible across the Python and TypeScript implementations.

## Key directories

- `templates/`: Jinja source pages. Use `base.html` for shared navigation and footer changes.
- `static/`: Source CSS and browser JavaScript.
- `public/`: Generated static deployment pages and copied assets. Regenerate after template changes.
- `services/`: Python-only service integrations.
- `netlify/functions/`: TypeScript endpoints. Use standard Web API `Request` and `Response` objects.
- `db/`: Drizzle schema and Netlify Database client.
- `netlify/database/migrations/`: Immutable SQL migrations applied by Netlify.

## Conventions

- Preserve the warm editorial travel aesthetic and CSS custom-property theme system.
- Use semantic HTML, visible labels, keyboard-accessible controls, and meaningful alt text.
- Keep browser code dependency-light and escape AI-generated content before inserting HTML.
- Never expose watsonx API keys to the browser. AI requests belong in Flask or Netlify Functions.
- Persistent travel plans must use Netlify Database; do not add local JSON or in-memory persistence.
- Do not edit an applied migration. Add a new timestamped migration for schema changes.
- Do not commit `.env`, generated credentials, API responses containing private data, or deployment state.

## Static rendering

Run `python generate_static.py`, then copy `static/` to `public/static/` whenever templates or shared assets change. Flask is not required by the renderer. The checked-in `public/` output is necessary because Netlify publishes that directory directly.

## Product decisions

Deployed authentication uses the headless `@netlify/identity` client. Flask remains a simple local teaching server, while Netlify Functions derive plan ownership from the authenticated user instead of trusting browser-submitted email values.
