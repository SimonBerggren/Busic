import * as CANNON from "cannon";
import * as THREE from "three";

export default {
    material: {
        drum: new CANNON.Material("drum"),
        ball: new CANNON.Material("ball")
    },
    camera: {
        orthographic: {
            left: window.innerWidth / -2,
            right: window.innerWidth / 2,
            top: window.innerHeight / 2,
            bottom: window.innerHeight / -2
        },
        perspective: {
            fov: 70,
            near: 0.01,
            aspect: window.innerWidth / window.innerHeight,
            far: 10,
            z: 5
        }
    },
    renderer: {
        clearColor: new THREE.Color("#1baaaa")
    }
}