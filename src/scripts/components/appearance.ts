import * as CANNON from "cannon";
import * as THREE from "three";

const radius = 0.075;
const size = 0.5;
const hSize = 0.25;

class Appearance {
    shape: CANNON.Shape;
    mesh: THREE.Mesh;
}

class Box extends Appearance {
    shape = new CANNON.Box(new CANNON.Vec3(hSize, hSize, hSize));
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshPhongMaterial({wireframe: false}));
}

class Sphere extends Appearance {
    shape = new CANNON.Sphere(radius);
    mesh = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial());
}

export { Appearance, Box, Sphere };