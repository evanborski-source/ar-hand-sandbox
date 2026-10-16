import * as THREE from 'three'
import { createHandMesh } from './utils/handMesh'
import type { Physics } from './physics/engine'

export class App {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  container: HTMLElement
  handMesh: THREE.Object3D

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)

    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    this.camera = new THREE.PerspectiveCamera(70, w / h, 0.01, 100)
    this.camera.position.set(0, 1.6, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5, 10, 5)
    dir.castShadow = true
    this.scene.add(dir)

    // Grid floor
    const grid = new THREE.GridHelper(20, 40, 0x222222, 0x222222)
    this.scene.add(grid)

    // Hand mesh (placeholder)
    this.handMesh = createHandMesh()
    this.scene.add(this.handMesh)

    window.addEventListener('resize', () => this.onResize())
  }

  onResize() {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  setHandPose(pose: { position: THREE.Vector3; rotation: THREE.Euler; scale?: number }) {
    this.handMesh.position.copy(pose.position)
    this.handMesh.rotation.copy(pose.rotation)
    if (pose.scale) this.handMesh.scale.setScalar(pose.scale)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  async spawnBox(size = 0.2, position = new THREE.Vector3(0, 1.2, -1)) {
    const geo = new THREE.BoxGeometry(size, size, size)
    const mat = new THREE.MeshStandardMaterial({ color: 0x8888ff })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.position.copy(position)
    this.scene.add(mesh)
    return mesh
  }
}
