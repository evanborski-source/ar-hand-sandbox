import * as RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import type { App, HandPose } from '../renderer'
import type { HandTracker } from '../handTracker'

export type PhysicsObject = {
  mesh: THREE.Object3D
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  material?: string
  fractured?: boolean
  fractureThreshold?: number
}

export type GrabAttachment = {
  body: RAPIER.RigidBody
  mesh: THREE.Object3D
  handSide: 'left' | 'right'
  localOffset: THREE.Vector3
}

export class Physics {
  private app: App
  world: RAPIER.World
  objects: PhysicsObject[] = []
  grabs: GrabAttachment[] = []
  ropes: Array<{ nodes: RAPIER.RigidBody[]; restLength: number }> = []

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
    // update hand poses on renderer
    const hands = handTracker.getHands()
    this.app.setHandPose('left', hands.left)
    this.app.setHandPose('right', hands.right)

    // apply grab spring forces before stepping to improve stability
    this.applyGrabSprings(dt, hands)

    // physics substeps
    const iterations = Math.max(1, Math.ceil(dt * 120))
    for (let i = 0; i < iterations; i++) {
      this.world.step()
      // enforce rope constraints after each physics step
      this.enforceRopeConstraints()
      // detect fracture events
      this.detectFractures()
    }

    // sync meshes
    for (const object of this.objects) {
      const tx = object.body.translation()
      const rot = object.body.rotation()
      const mesh = object.mesh as THREE.Mesh
      mesh.position.set(tx.x, tx.y, tx.z)
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }
  }

  // Add a visual object and create a physics body for it.
  addObject(mesh: THREE.Object3D, options: { mass?: number; material?: 'metal' | 'rubber' | 'wood' | 'glass' | 'default' } = {}) {
    const mass = options.mass ?? 1
    const type = options.material ?? 'default'

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
    const body = this.world.createRigidBody(bodyDesc)

    // compute approximate bounds
    const bounds = new THREE.Box3().setFromObject(mesh)
    const size = bounds.getSize(new THREE.Vector3())
    // avoid zero-size
    const half = new THREE.Vector3(Math.max(0.01, size.x * 0.5), Math.max(0.01, size.y * 0.5), Math.max(0.01, size.z * 0.5))
    const colliderDesc = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
    colliderDesc.setRestitution(type === 'rubber' ? 0.92 : 0.52)
    colliderDesc.setFriction(type === 'metal' ? 0.8 : 0.4)
    const collider = this.world.createCollider(colliderDesc, body.handle)

    body.setMass(mass, true)

    const physObj: PhysicsObject = { mesh, body, collider, material: type }
    if (type === 'glass') {
      physObj.fractureThreshold = 3.6 // tunable
    }

    this.objects.push(physObj)
    return physObj
  }

  // Simple spring-based grabbing: attach nearest object to a hand point by applying impulses
  grabNearestObject(handSide: 'left' | 'right', targetPos: THREE.Vector3, maxDistance = 0.25) {
    // find nearest dynamic object
    let nearest: PhysicsObject | null = null
    let nearestDist = Infinity
    for (const obj of this.objects) {
      if (obj.body.isDynamic()) {
        const pos = obj.body.translation()
        const dx = pos.x - targetPos.x
        const dy = pos.y - targetPos.y
        const dz = pos.z - targetPos.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < nearestDist) {
          nearestDist = d2
          nearest = obj
        }
      }
    }
    if (!nearest) return false
    const dist = Math.sqrt(nearestDist)
    if (dist > maxDistance) return false

    // compute local offset from body center to the target
    const bodyPos = nearest.body.translation()
    const localOffset = new THREE.Vector3(targetPos.x - bodyPos.x, targetPos.y - bodyPos.y, targetPos.z - bodyPos.z)
    this.grabs.push({ body: nearest.body, mesh: nearest.mesh, handSide, localOffset })
    return true
  }

  releaseGrab(handSide: 'left' | 'right', handVelocity: THREE.Vector3) {
    // release all grabs for this hand, applying impulse from handVelocity
    const remaining: GrabAttachment[] = []
    for (const g of this.grabs) {
      if (g.handSide === handSide) {
        const body = g.body
        const mass = body.mass()
        const impulse = { x: handVelocity.x * mass, y: handVelocity.y * mass, z: handVelocity.z * mass }
        try {
          body.applyImpulse(impulse, true)
        } catch (e) {
          // ignore
        }
      } else {
        remaining.push(g)
      }
    }
    this.grabs = remaining
  }

  private applyGrabSprings(dt: number, hands: { left: HandPose; right: HandPose }) {
    if (this.grabs.length === 0) return
    // spring constants
    const k = 40 // stiffness
    const damping = 8

    for (const g of this.grabs) {
      // find hand pose
      const handPose = g.handSide === 'left' ? hands.left : hands.right
      const targetWorld = new THREE.Vector3().copy(handPose.position).add(g.localOffset)
      // compute body state
      const pos = g.body.translation()
      const bodyPos = new THREE.Vector3(pos.x, pos.y, pos.z)
      const vel = g.body.linvel()
      const bodyVel = new THREE.Vector3(vel.x, vel.y, vel.z)

      // desired velocity to move the point toward target: v_des = k * (target - pos)
      const delta = new THREE.Vector3().subVectors(targetWorld, bodyPos)
      const desiredVel = delta.multiplyScalar(k * dt)
      // damping
      const velCorrection = new THREE.Vector3().subVectors(desiredVel, bodyVel).multiplyScalar(1)

      // impulse = mass * velCorrection
      const mass = g.body.mass()
      const impulse = velCorrection.multiplyScalar(mass)
      try {
        g.body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true)
        // also damp angular velocity a bit
        const ang = g.body.angvel()
        g.body.setAngvel({ x: ang.x * 0.92, y: ang.y * 0.92, z: ang.z * 0.92 }, true)
      } catch (e) {
        // ignore situations where body is removed concurrently
      }
    }
  }

  // Fracture detection: simple velocity-based brittle fracture for glass materials
  private detectFractures() {
    const toFracture: PhysicsObject[] = []
    for (const obj of this.objects) {
      if (obj.material === 'glass' && !obj.fractured && obj.fractureThreshold) {
        const vel = obj.body.linvel()
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
        if (speed > obj.fractureThreshold) {
          toFracture.push(obj)
        }
      }
    }

    for (const obj of toFracture) {
      this.fractureObject(obj)
    }
  }

  private fractureObject(obj: PhysicsObject) {
    obj.fractured = true
    // remove original
    try {
      this.world.removeRigidBody(obj.body)
    } catch (e) {}
    this.app.scene.remove(obj.mesh)
    this.objects = this.objects.filter((o) => o !== obj)

    // create simple shards (small boxes)
    const shards = 8
    const bounds = new THREE.Box3().setFromObject(obj.mesh)
    const center = bounds.getCenter(new THREE.Vector3())

    for (let i = 0; i < shards; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(bounds.getSize(new THREE.Vector3()).x / 3, bounds.getSize(new THREE.Vector3()).y / 3, bounds.getSize(new THREE.Vector3()).z / 3), new THREE.MeshStandardMaterial({ color: 0x99ccff, roughness: 0.2, metalness: 0 }))
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)
      s.position.copy(center).add(jitter)
      this.app.scene.add(s)

      // add physics body for shard
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(s.position.x, s.position.y, s.position.z)
      const body = this.world.createRigidBody(bodyDesc)
      const hx = 0.05
      const collider = this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hx, hx), body.handle)
      body.setMass(0.2, true)
      const impulse = { x: (Math.random() - 0.5) * 2, y: Math.random() * 2, z: (Math.random() - 0.5) * 2 }
      try {
        body.applyImpulse(impulse, true)
      } catch (e) {}
      this.objects.push({ mesh: s, body, collider, material: 'glass', fractured: true })
    }
  }

  // Rope: create a chain of small bodies with manual distance constraints
  createRope(start: THREE.Vector3, end: THREE.Vector3, segments = 12) {
    const nodes: RAPIER.RigidBody[] = []
    const dir = new THREE.Vector3().subVectors(end, start)
    const segLen = dir.length() / segments
    dir.normalize()
    for (let i = 0; i <= segments; i++) {
      const pos = new THREE.Vector3().copy(start).add(dir.clone().multiplyScalar(i * segLen))
      const s = new THREE.Mesh(new THREE.SphereGeometry(segLen * 0.3), new THREE.MeshStandardMaterial({ color: 0xffd1e6 }))
      s.position.copy(pos)
      this.app.scene.add(s)
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
      const body = this.world.createRigidBody(bodyDesc)
      const collider = this.world.createCollider(RAPIER.ColliderDesc.ball(segLen * 0.3), body.handle)
      body.setMass(0.05, true)
      nodes.push(body)
      this.objects.push({ mesh: s, body, collider, material: 'rope' })
    }
    this.ropes.push({ nodes, restLength: segLen })
    return nodes
  }

  private enforceRopeConstraints() {
    for (const rope of this.ropes) {
      for (let i = 0; i < rope.nodes.length - 1; i++) {
        const a = rope.nodes[i]
        const b = rope.nodes[i + 1]
        const ta = a.translation()
        const tb = b.translation()
        const pa = new THREE.Vector3(ta.x, ta.y, ta.z)
        const pb = new THREE.Vector3(tb.x, tb.y, tb.z)
        const delta = new THREE.Vector3().subVectors(pb, pa)
        const dist = delta.length()
        const diff = dist - rope.restLength
        if (Math.abs(diff) > 1e-4) {
          // correct half-half
          const n = delta.normalize()
          const correction = n.multiplyScalar(diff * 0.5)
          try {
            a.setTranslation({ x: pa.x + correction.x, y: pa.y + correction.y, z: pa.z + correction.z }, true)
            b.setTranslation({ x: pb.x - correction.x, y: pb.y - correction.y, z: pb.z - correction.z }, true)
          } catch (e) {}
        }
      }
    }
  }

  clear() {
    for (const object of this.objects) {
      try {
        this.world.removeRigidBody(object.body)
      } catch (e) {}
      this.app.scene.remove(object.mesh)
    }
    this.objects = []
    this.grabs = []
    // attempt to clear ropes
    this.ropes = []
  }
}
