import './style.css'
import { App } from './renderer'
import { Physics } from './physics/engine'
import { DemoAI } from './ai/demoAI'
import { HandTracker } from './handTracker'
import { setupCommandInput } from './ui/commandInput'

async function bootstrap() {
  const app = new App(document.getElementById('canvas-container')!)
  const physics = await Physics.create(app)
  const handTracker = new HandTracker()
  const ai = new DemoAI()

  setupCommandInput(ai, app, physics)

  // Simple loop
  let last = performance.now()
  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    handTracker.update(dt)
    physics.step(dt, handTracker)
    app.render()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  (document.getElementById('status') as HTMLElement).innerText = 'Status: ready (demo mode)'
}

bootstrap()
