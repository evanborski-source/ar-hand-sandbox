# AR Hand Sandbox

This repository contains an initial scaffold for the AR Hand Sandbox demo.

Features in this commit:
- Three.js scene with black-box environment and grid floor
- Simple stylized hand mesh rendered in first-person
- Rapier physics scaffold (rigid bodies, basic box spawning)
- Demo AI fallback (text-based) for spawning boxes and clearing the scene
- Mouse-based hand pose simulator as a placeholder for MediaPipe

Getting started:

1. Install:

   npm install

2. Run dev server:

   npm run dev

3. Open the URL shown by Vite (usually http://localhost:5173)

Notes / next steps:
- Integrate MediaPipe hand tracking: replace src/handTracker.ts update() with real landmark->pose mapping.
- Implement kinematic hand proxies and grab constraints in physics engine.
- Add secure backend proxy for an LLM and implement structured command parsing.

Privacy: this demo never displays webcam frames. When MediaPipe is integrated, the tracker should run locally and webcam data must not be uploaded to any server.
