import * as THREE from 'three'

export function createHandMesh() {
  // Simplified stylized hand: a jointed set of spheres for demo purposes.
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xffccaa })
  for (let i = 0; i < 5; i++) {
    const finger = new THREE.Group()
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.03), mat)
      s.position.x = i * 0.04 - 0.08
      s.position.y = -j * 0.04
      finger.add(s)
    }
    group.add(finger)
  }
  group.position.set(0, 1.4, -0.4)
  group.scale.setScalar(1.2)
  return group
}
