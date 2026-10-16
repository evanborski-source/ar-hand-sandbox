import * as THREE from 'three'
import type { App } from '../renderer'
import type { Physics } from '../physics/engine'

export class DemoAI {
  async runCommand(text: string, app: App, physics: Physics) {
    const t = text.trim().toLowerCase()
    if (t.startsWith('spawn box') || t.startsWith('spawn a box') || t.startsWith('spawn cube')) {
      const mesh = await app.spawnBox(0.2, new THREE.Vector3(0, 1.2, -1))
      physics.addBox(mesh, 1)
      return 'spawned box'
    }
    if (t.startsWith('clear')) {
      physics.clear()
      return 'scene cleared'
    }
    return "didn't understand (demo AI)"
  }
}
