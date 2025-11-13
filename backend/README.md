# Backend - Dominant Color API

This backend is the existing Express-based API for the app. I added a small server endpoint to extract the dominant color from a remote image using `node-vibrant`.

Endpoint
- GET /api/dominant?url=<IMAGE_URL>
  - Returns JSON: { color: "#rrggbb", textColor: "#ffffff" }
  - `textColor` is `#ffffff` or `#000000` chosen to maximize contrast against the color
  - Example: `/api/dominant?url=https://example.com/art.jpg`

Notes
- The implementation uses `node-vibrant` to compute a palette and returns the most-populated swatch in hex form.
- A small in-memory cache with a 10 minute TTL is used to avoid repeated work for the same URL.

Local development
1. From the `backend` folder run:

```powershell
npm install
npm run dev
```

2. By default the server will attempt to connect to the configured MongoDB (same as original project). For the dominant endpoint you only need the app running; if DB is not available the server may still error during start because the app attempts to connect — if you want to run only the endpoint for local testing, set the environment variable `NODE_ENV=development` and ensure `connectDB()` is tolerant, or comment out DB connect lines in `src/server.js` temporarily.

Using from the Expo app
- Update `NeuroTune/constants/api.js` to point `API_URL` to your local backend during development, e.g. `http://localhost:3000/` or your machine's LAN IP if running on a device.

Deployment
- Works on Vercel as a serverless function if you deploy this backend as an Express app. `node-vibrant` is pure JS but includes native-friendly code paths; if you deploy to serverless, ensure the target Node version supports `node-vibrant` and that large images remain within your provider limits.

Security
- The endpoint fetches arbitrary remote URLs. Consider adding a whitelist or additional validation if you expose this to the public.
