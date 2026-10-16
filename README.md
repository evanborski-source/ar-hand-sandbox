html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

#canvas-root {
  position: fixed;
  inset: 0;
}

#hud {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 20;
  pointer-events: none;
}

.panel {
  pointer-events: auto;
  background: rgba(8, 12, 18, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle,
.tips,
#status {
  font-size: 12px;
  color: #c9d6ea;
  margin-top: 4px;
}

.controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

input {
  width: 280px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(18, 24, 30, 0.8);
  color: white;
}

button {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6ea8ff, #4166ff);
  color: white;
  cursor: pointer;
  font-weight: 600;
}

button:last-child {
  background: linear-gradient(135deg, #ff8d5a, #ff5d73);
}
