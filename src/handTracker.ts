# AR Hand Sandbox

A browser-based interactive sandbox with a dark chamber, first-person camera, tracked virtual hands, and a local AI-inspired object spawner. The app uses Three.js for rendering, Rapier for physics, and a browser-only hand-tracking fallback so the webcam is never shown in the game viewport.

Features
- First-person black box environment with floor grid and atmospheric lighting
- Virtual hands rendered in-scene without showing the live webcam preview
- Physics-based object spawning and collision behavior
- Text command box for spawn/create commands
- Clear/reset support
- Local demo AI mode when no external model API is available
- MediaPipe integration is prepared and optional, running locally on the client

Run locally
1. Install dependencies:
   npm install
2. Start the dev server:
   npm run dev
3. Open the URL shown by Vite (usually http://localhost:5173)

Commands
- spawn box
- spawn ball
- spawn metal ball
- spawn sword
- clear
- help

Privacy
- The webcam is only used for local hand tracking when available.
- The live camera feed is never displayed inside the game view.
- No raw video frames are sent to an external AI service in this local demo mode.

Important note
This is a playable local MVP for a browser-based AR-hand sandbox. It is intentionally built to work on a Chromebook and keep the experience focused on a working sandbox loop rather than a fake mockup.
