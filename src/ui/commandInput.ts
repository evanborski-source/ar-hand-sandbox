import { DemoAI } from '../ai/demoAI'
import type { App } from '../renderer'
import type { Physics } from '../physics/engine'

export function setupCommandInput(ai: DemoAI, app: App, physics: Physics) {
  const input = document.getElementById('cmd') as HTMLInputElement
  const btn = document.getElementById('send') as HTMLButtonElement
  const reset = document.getElementById('reset') as HTMLButtonElement
  const status = document.getElementById('status') as HTMLElement
  btn.onclick = async () => {
    const text = input.value
    status.innerText = 'AI: processing...'
    const res = await ai.runCommand(text, app, physics)
    status.innerText = `AI: ${res}`
    input.value = ''
  }
  reset.onclick = () => {
    physics.clear()
    status.innerText = 'scene cleared'
  }
}
