# Grofunder — Frontend

Three React apps and the original HTML mockups.

- **frontend-farmer/** — mobile-first farmer app
- **frontend-coop/** — cooperative portal
- **frontend-admin/** — Grofunder admin console

Each is a standalone Vite + React + TypeScript project. To deploy one on Vercel:
set that app's folder as the project Root Directory (e.g. `frontend-farmer`), and
set env var `VITE_API_URL` to your backend URL (e.g.
https://grofunder-backend.onrender.com). Without it, the app uses a local dev proxy.

Mockups (grofunder_*_mockup.html) are static visual references.
