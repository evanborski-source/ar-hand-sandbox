import * as THREE from 'three'

export class HandTracker {
  // For the initial scaffold we simulate hand pose with the mouse.
  private pose = { position: new THREE.Vector3(0, 1.4, -0.4), rotation: new THREE.Euler() }
  private lastMouse = { x: 0, y: 0 }

  constructor() {
    window.addEventListener('mousemove', (e) => this.onMouse(e))
    window.addEventListener('touchmove', (e) => { if (e.touches[0]) this.onTouch(e.touches[0]) })
  }

  onMouse(e: MouseEvent) {
    this.lastMouse.x = e.clientX
    this.lastMouse.y = e.clientY
    this.updateFromScreen()
  }

  onTouch(t: Touch) {
    this.lastMouse.x = t.clientX
    this.lastMouse.y = t.clientY
    this.updateFromScreen()
  }

  updateFromScreen() {
    const w = window.innerWidth
    const h = window.innerHeight
    const nx = (this.lastMouse.x / w) * 2 - 1
    const ny = -(this.lastMouse.y / h) * 2 + 1
    // map to a small area in front of camera
    this.pose.position.set(nx * 0.5, 1.4 + ny * 0.3, -0.4)
    this.pose.rotation.set(0, 0, 0)
  }

  update(dt: number) {
    // placeholder for real MediaPipe integration
  }

  getPose() {
    return this.pose
  }
}
