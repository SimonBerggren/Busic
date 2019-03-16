import * as THREE from "three";

import settings from "../utils/settings";
import Object3D from "./object";

export default class Camera {
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    private cameraViewProjectionMatrix: THREE.Matrix4;
    private oCamera: THREE.OrthographicCamera;
    private pCamera: THREE.PerspectiveCamera;
    private frustum: THREE.Frustum;

    constructor() {
        const { left, right, top, bottom } = settings.camera.orthographic;
        const { fov, aspect, near, far, z } = settings.camera.perspective;
        this.oCamera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
        this.pCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.pCamera.position.z = z;
        this.camera = this.pCamera;
        this.frustum = new THREE.Frustum();
        this.cameraViewProjectionMatrix = new THREE.Matrix4();
    }

    update = () => {
        this.pCamera.aspect = window.innerWidth / window.innerHeight;

        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld(false);
        this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

        this.cameraViewProjectionMatrix.identity();
        this.cameraViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromMatrix(this.cameraViewProjectionMatrix);
    }

    canSeeObject(object: Object3D) {
        return this.frustum.intersectsObject(object.mesh);
    }
}