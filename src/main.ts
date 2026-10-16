import './style.css'
import { App } from './renderer'
import { Physics } from './physics/engine'
import { DemoAI } from './ai/demoAI'
import { HandTracker } from './handTracker'
import { setupCommandInput } from './ui/commandInput'

async function bootstrap() {
  const app = new App(document.getElementById('canvas-root') as HTMLElement)
  const physics = await Physics.create(app)
  const handTracker = new HandTracker(app)
  const ai = new DemoAI()

  setupCommandInput(ai, app, physics, handTracker)

  let last = performance.now()
  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now

    handTracker.update(dt)
    physics.step(dt, handTracker)
    app.render()
    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)
  const status = document.getElementById('status') as HTMLDivElement
  status.textContent = 'Status: ready (demo sandbox mode)'
}

bootstrap().catch((e) => {
  console.error(e)
  const status = document.getElementById('status') as HTMLDivElement | null
  if (status) status.textContent = 'Status: failed to initialize the sandbox.'
})
