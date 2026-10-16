import * as RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { App, HandPose } from '../renderer'
import type { HandTracker } from '../handTracker'

export type PhysicsObject = {
  mesh: THREE.Object3D
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
}

export class Physics {
  private app: App
  world: RAPIER.World
  objects: PhysicsObject[] = []

  private constructor(app: App, world: RAPIER.World) {
    this.app = app
    this.world = world
  }

  static async create(app: App) {
    await RAPIER.init()
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    return new Physics(app, world)
  }

  step(dt: number, handTracker: HandTracker) {
    const hands = handTracker.getHands()
    this.app.setHandPose('left', hands.left)
    this.app.setHandPose('right', hands.right)

    const iterations = Math.max(1, Math.ceil(dt * 120))
    for (let i = 0; i < iterations; i++) {
      this.world.step()
    }

    for (const object of this.objects) {
      const tx = object.body.translation()
      const rot = object.body.rotation()
      const mesh = object.mesh as THREE.Mesh
      mesh.position.set(tx.x, tx.y, tx.z)
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }
  }

  addObject(mesh: THREE.Object3D, options: { mass?: number; material?: 'metal' | 'rubber' | 'wood' | 'glass' | 'default' } = {}) {
    const mass = options.mass ?? 1
    const type = options.material ?? 'default'

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
    const body = this.world.createRigidBody(bodyDesc)

    const bounds = new THREE.Box3().setFromObject(mesh)
    const size = bounds.getSize(new THREE.Vector3())
    const half = size.multiplyScalar(0.5)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
    colliderDesc.setRestitution(type === 'rubber' ? 0.92 : 0.52)
    colliderDesc.setFriction(type === 'metal' ? 0.8 : 0.4)
    const collider = this.world.createCollider(colliderDesc, body.handle)

    body.setMass(mass, true)
    this.objects.push({ mesh, body, collider })
    return { body, collider }
  }

  clear() {
    for (const object of this.objects) {
      this.world.removeRigidBody(object.body)
      this.app.scene.remove(object.mesh)
    }
    this.objects = []
  }
}
