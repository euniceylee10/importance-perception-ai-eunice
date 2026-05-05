# Importance Perception AI (JavaScript version)

A JavaScript/Node demo of the Importance Perception AI system, with a web page that shows cognitive load, priority alignment, reframing suggestions, and strain mapping.

## Run locally

1. Open a terminal in `MSTU-5010-Student/JIN FINAL`
2. Install dependencies:
   - `npm install`
3. Start the app:
   - `npm start`
4. Open the demo page:
   - `http://localhost:5001/`

## What it includes

- `server.js` — Node/Express server that serves the UI and API
- `engine.js` — AI model logic for cognitive load and alignment
- `templates/index.html` — visible web page
- `static/main.js` — browser interaction and analysis calls
- `static/styles.css` — UI styling

## Notes

- No Python is required for this version.
- The web app computes cognitive load from personal and work tasks using a human-centered importance model.
