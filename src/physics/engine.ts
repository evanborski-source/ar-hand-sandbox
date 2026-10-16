import * as RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { HandTracker } from '../handTracker'

export class Physics {
  world: RAPIER.World
  bodies: Array<{ mesh: THREE.Mesh; body: RAPIER.RigidBody }>
  app: any

  private constructor(world: RAPIER.World, app: any) {
    this.world = world
    this.bodies = []
    this.app = app
  }

  static async create(app: any) {
    await RAPIER.init()
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    const phys = new Physics(world, app)
    return phys
  }

  step(dt: number, handTracker: HandTracker) {
    // simple fixed-step
    const steps = Math.max(1, Math.floor(dt / (1 / 60)))
    for (let i = 0; i < steps; i++) this.world.step()

    // sync meshes
    for (const o of this.bodies) {
      const pos = o.body.translation()
      const rot = o.body.rotation()
      o.mesh.position.set(pos.x, pos.y, pos.z)
      o.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }

    // update hand proxy (placeholder: we don't create kinematic proxies yet)
    const h = handTracker.getPose()
    if (h && this.app) this.app.setHandPose({ position: h.position, rotation: h.rotation })
  }

  addBox(mesh: THREE.Mesh, mass = 1) {
    const pos = mesh.position
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
    const body = this.world.createRigidBody(bodyDesc)
    const hx = mesh.scale.x * 0.5
    const collider = RAPIER.ColliderDesc.cuboid(hx, hx, hx)
    this.world.createCollider(collider, body.handle)
    this.bodies.push({ mesh, body })
    return body
  }

  clear() {
    // remove all bodies and meshes
    for (const o of this.bodies) {
      this.world.removeRigidBody(o.body)
      this.app.scene.remove(o.mesh)
    }
    this.bodies = []
  }
}
