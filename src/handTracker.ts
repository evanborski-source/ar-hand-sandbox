import * as THREE from 'three'

export type HandPose = {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  pinch: number
}

export class HandTracker {
  private left: HandPose = {
    position: new THREE.Vector3(-0.55, 1.35, -0.45),
    rotation: new THREE.Euler(0, 0, 0),
    scale: 1.0,
    pinch: 0,
  }

  private right: HandPose = {
    position: new THREE.Vector3(0.55, 1.35, -0.45),
    rotation: new THREE.Euler(0, 0, 0),
    scale: 1.0,
    pinch: 0,
  }

  private mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  private app: any
  private video: HTMLVideoElement | null = null
  private handLandmarker: any = null
  private cameraReady = false
  private lastLeftPos = new THREE.Vector3()
  private lastRightPos = new THREE.Vector3()
  private lastUpdate = performance.now()

  constructor(app: any) {
    this.app = app
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
    })

    void this.initCamera()
  }

  private async initCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      await video.play()

      this.video = video
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm')
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      })
      this.cameraReady = true
    } catch (e) {
      console.warn('Camera not available - falling back to mouse-based demo hand tracking.', e)
      this.cameraReady = false
    }
  }

  update(dt: number) {
    const now = performance.now()
    const elapsed = (now - this.lastUpdate) / 1000
    this.lastUpdate = now

    if (this.cameraReady && this.video && this.handLandmarker) {
      try {
        const result = this.handLandmarker.detectForVideo(this.video, performance.now())
        if (result.landmarks && result.landmarks.length > 0) {
          const hand0 = result.landmarks[0]
          const hand1 = result.landmarks.length > 1 ? result.landmarks[1] : null
          this.updateHandFromLandmarks('left', hand0)
          if (hand1) this.updateHandFromLandmarks('right', hand1)
          return
        }
      } catch (e) {
        console.warn('HandLandmarker detect failed', e)
      }
    }

    this.updateHandFromMouse('left')
    this.updateHandFromMouse('right')
  }

  private updateHandFromMouse(side: 'left' | 'right') {
    const pointerX = (this.mouse.x / window.innerWidth) * 2 - 1
    const pointerY = -((this.mouse.y / window.innerHeight) * 2 - 1)
    const x = side === 'left' ? -0.55 + pointerX * 0.6 : 0.55 + pointerX * 0.6
    const y = 1.35 + pointerY * 0.5
    const z = -0.55
    const pose = side === 'left' ? this.left : this.right
    pose.position.set(x, y, z)
    pose.rotation.set(0.25 + pointerY * 0.7, (side === 'left' ? -1 : 1) * (pointerX * 0.8), 0)
    pose.scale = 1.0
    // compute faux pinch based on vertical position
    pose.pinch = Math.max(0, 1 - Math.abs(pointerY * 2))
  }

  private updateHandFromLandmarks(side: 'left' | 'right', points: Array<{ x: number; y: number; z: number }>) {
    // compute average point and thumb-index distance for pinch
    const average = points.reduce(
      (acc, point) => {
        acc.x += point.x
        acc.y += point.y
        acc.z += point.z
        return acc
      },
      { x: 0, y: 0, z: 0 }
    )
    const count = Math.max(points.length, 1)
    const pose = side === 'left' ? this.left : this.right
    // map normalized coordinates to world area in front of camera
    pose.position.set((average.x / count - 0.5) * 2.2, 1.2 - (average.y / count - 0.5) * 1.8, -0.5 + (average.z / count) * 1.4)
    pose.rotation.set(-0.3, side === 'left' ? -0.9 : 0.9, 0.1)
    pose.scale = 1.15

    // pinch detection: use landmark indices 4 (thumb tip) and 8 (index fingertip)
    const thumb = points[4]
    const index = points[8]
    if (thumb && index) {
      const dx = thumb.x - index.x
      const dy = thumb.y - index.y
      const dz = (thumb.z ?? 0) - (index.z ?? 0)
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      // typical threshold: normalized distance < ~0.06
      const pinchVal = Math.max(0, Math.min(1, (0.06 - d) / 0.06))
      pose.pinch = pinchVal
    }
  }

  getHands(): { left: HandPose; right: HandPose } {
    return { left: this.left, right: this.right }
  }
}
