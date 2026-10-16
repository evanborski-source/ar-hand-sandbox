import * as THREE from 'three'

export type HandPose = {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  pinch: number
}

export class App {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  container: HTMLElement
  leftHand: THREE.Group
  rightHand: THREE.Group
  worldObjects: THREE.Object3D[] = []

  constructor(container: HTMLElement) {
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020406)

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 1.6, 2.2)
    this.camera.lookAt(0, 1.2, -2)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    const ambient = new THREE.HemisphereLight(0x9ec3ff, 0x111111, 1.0)
    this.scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(4, 8, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(keyLight)

    const rimLight = new THREE.PointLight(0x5db3ff, 15, 30, 2)
    rimLight.position.set(-5, 3, -5)
    this.scene.add(rimLight)

    const chamberFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.15 })
    )
    chamberFloor.rotation.x = -Math.PI / 2
    chamberFloor.position.y = -0.01
    chamberFloor.receiveShadow = true
    this.scene.add(chamberFloor)

    const grid = new THREE.GridHelper(20, 30, 0x2c2f33, 0x1a1d20)
    grid.position.y = 0.001
    this.scene.add(grid)

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.95, metalness: 0.1 })
    const chamber = new THREE.Group()
    const back = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 0.25), wallMaterial)
    back.position.set(0, 3.5, -8.5)
    chamber.add(back)
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 18), wallMaterial)
    left.position.set(-9, 3.5, 0)
    chamber.add(left)
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 18), wallMaterial)
    right.position.set(9, 3.5, 0)
    chamber.add(right)
    this.scene.add(chamber)

    this.leftHand = this.createHandMesh(0xffd0b3)
    this.rightHand = this.createHandMesh(0xffd4af)
    this.leftHand.position.set(-0.6, 1.2, -0.6)
    this.rightHand.position.set(0.6, 1.2, -0.6)
    this.scene.add(this.leftHand)
    this.scene.add(this.rightHand)

    window.addEventListener('resize', () => this.onResize())
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  createHandMesh(color: number): THREE.Group {
    const group = new THREE.Group()
    const palmMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 })
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), palmMaterial)
    palm.castShadow = true
    palm.position.y = 0.08
    group.add(palm)

    for (let i = 0; i < 5; i++) {
      const finger = new THREE.Group()
      for (let j = 0; j < 3; j++) {
        const segment = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 4, 8), palmMaterial)
        segment.castShadow = true
        segment.rotation.z = Math.PI / 2
        segment.position.set((i - 2) * 0.04, 0.22 - j * 0.095, 0.02)
        finger.add(segment)
      }
      group.add(finger)
    }

    group.scale.setScalar(1.5)
    return group
  }

  setHandPose(side: 'left' | 'right', pose: HandPose) {
    const hand = side === 'left' ? this.leftHand : this.rightHand
    hand.position.copy(pose.position)
    hand.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.order)
    hand.scale.setScalar(pose.scale)
  }

  addWorldObject(mesh: THREE.Mesh) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.scene.add(mesh)
    this.worldObjects.push(mesh)
    return mesh
  }

  clearWorld() {
    for (const object of [...this.worldObjects]) {
      this.scene.remove(object)
      object.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          ;(child as THREE.Mesh).geometry.dispose()
        }
        if ((child as THREE.Mesh).material) {
          const material = (child as THREE.Mesh).material as THREE.Material | THREE.Material[]
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose())
          } else {
            material.dispose()
          }
        }
      })
    }
    this.worldObjects = []
  }

  createObject(type: string, options: { position?: THREE.Vector3; size?: number; material?: string; color?: number } = {}) {
    const size = options.size ?? 0.42
    const position = options.position ?? new THREE.Vector3(0, 1.2, -2)
    const color = options.color ?? 0x9ec7ff

    let geometry: THREE.BufferGeometry
    let material: THREE.Material

    switch (type) {
      case 'ball':
      case 'sphere':
        geometry = new THREE.SphereGeometry(size * 0.5, 24, 24)
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 })
        break
      case 'box':
      case 'cube':
        geometry = new THREE.BoxGeometry(size, size, size)
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(size * 0.45, size * 0.45, size, 24)
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.2 })
        break
      case 'sword':
        const group = new THREE.Group()
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(size * 0.12, size * 1.5, size * 0.06),
          new THREE.MeshStandardMaterial({ color: 0x8fb7ff, emissive: 0x1155aa, emissiveIntensity: 0.7, metalness: 0.8, roughness: 0.2 })
        )
        blade.position.y = size * 0.65
        group.add(blade)
        const guard = new THREE.Mesh(new THREE.BoxGeometry(size * 0.42, size * 0.08, size * 0.12), new THREE.MeshStandardMaterial({ color: 0xc2d4ff }))
        guard.position.y = 0.1
        group.add(guard)
        const handle = new THREE.Mesh(new THREE.BoxGeometry(size * 0.08, size * 0.6, size * 0.08), new THREE.MeshStandardMaterial({ color: 0x5b3b2a }))
        handle.position.y = -0.42
        group.add(handle)
        group.position.copy(position)
        this.scene.add(group)
        this.worldObjects.push(group)
        return group
      case 'car':
        const car = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(size * 1.2, size * 0.5, size), new THREE.MeshStandardMaterial({ color: 0x7ef0d2 }))
        body.position.y = 0.1
        car.add(body)
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(size * 0.7, size * 0.45, size * 0.72), new THREE.MeshStandardMaterial({ color: 0x9cc5ff }))
        cabin.position.set(0, 0.45, 0)
        car.add(cabin)
        const wheelGeom = new THREE.CylinderGeometry(size * 0.18, size * 0.18, size * 0.14, 16)
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
        for (const x of [-0.5, 0.5]) {
          for (const z of [-0.4, 0.4]) {
            const wheel = new THREE.Mesh(wheelGeom, wheelMat)
            wheel.rotation.z = Math.PI / 2
            wheel.position.set(x, -0.2, z)
            car.add(wheel)
          }
        }
        car.position.copy(position)
        this.scene.add(car)
        this.worldObjects.push(car)
        return car
      default:
        geometry = new THREE.BoxGeometry(size, size, size)
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    return this.addWorldObject(mesh)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
