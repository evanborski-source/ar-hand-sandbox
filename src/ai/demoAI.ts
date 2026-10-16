import * as THREE from 'three'
import type { App } from '../renderer'
import type { Physics } from '../physics/engine'

export class DemoAI {
  async runCommand(text: string, app: App, physics: Physics) {
    const command = text.trim().toLowerCase()
    if (!command) return 'Type a command such as “spawn box” or “help”.'

    if (command === 'help' || command === '?') {
      return 'Try: spawn box, spawn ball, spawn metal ball, spawn sword, spawn glass ball, spawn rope, clear.'
    }

    if (command === 'clear' || command === 'reset') {
      physics.clear()
      app.clearWorld()
      return 'Scene cleared.'
    }

    const isMetal = /metal|steel|iron/.test(command)
    const isRubber = /rubber|soft/.test(command)
    const isWood = /wood|wooden/.test(command)
    const isGlass = /glass|shatter/.test(command)

    let type = 'box'
    if (/(sphere|ball)/.test(command)) type = 'ball'
    if (/(cube|box)/.test(command)) type = 'box'
    if (/(cylinder|rod|tube)/.test(command)) type = 'cylinder'
    if (/(sword|blade)/.test(command)) type = 'sword'
    if (/(car|vehicle)/.test(command)) type = 'car'
    if (/(rope)/.test(command)) type = 'rope'

    if (/(spawn|create)/.test(command) === false && !/(box|ball|sword|car|cylinder|rope|glass)/.test(command)) {
      return "Demo AI did not understand that command. Try: 'spawn box', 'spawn ball', 'spawn metal ball', 'spawn sword', 'spawn glass ball', 'spawn rope'."
    }

    const objectPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      1.7 + Math.random() * 1.2,
      -2.8 + Math.random() * 1.2
    )

    const colorMap: Record<string, number> = {
      metal: 0xa6b8d3,
      rubber: 0xf5a37b,
      wood: 0x7a4e2a,
      glass: 0xaee3ff,
      default: 0x88c1ff,
    }

    const materialName = isMetal ? 'metal' : isRubber ? 'rubber' : isWood ? 'wood' : isGlass ? 'glass' : 'default'

    if (type === 'rope') {
      // create rope between two random points
      const start = new THREE.Vector3((Math.random() - 0.5) * 1.6, 2.0, -2.2)
      const end = new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.8, -2.8)
      physics.createRope(start, end, 14)
      return 'Spawned rope.'
    }

    if (isGlass) {
      const mesh = app.createObject('ball', { position: objectPosition, size: 0.44, material: 'glass', color: colorMap['glass'] })
      physics.addObject(mesh, { mass: 0.9, material: 'glass' })
      return 'Spawned glass ball (fragile).'
    }

    const mesh = app.createObject(type, {
      position: objectPosition,
      size: type === 'sword' ? 0.7 : type === 'car' ? 1.0 : 0.48,
      material: materialName,
      color: colorMap[materialName],
    })

    const mass = isMetal ? 2.3 : isRubber ? 0.8 : isWood ? 1.2 : 1
    physics.addObject(mesh, { mass, material: materialName as any })

    return `Spawned ${materialName} ${type}.`
  }
}
