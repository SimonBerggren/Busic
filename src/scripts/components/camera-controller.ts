import * as THREE from 'three';

import { Vector3, EventDispatcher } from 'three';
import Camera from './camera';

const BUTTONS = {
    ORBIT: THREE.MOUSE.RIGHT,
    ZOOM: THREE.MOUSE.MIDDLE,
    PAN: THREE.MOUSE.LEFT
};

const STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY: 4,
    TOUCH_PAN: 5
};

export default class CameraController {

    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    disabled = false;
    target = new Vector3();

    zoomSpeed = 1;
    rotateSpeed = 1;
    keyPanSpeed = 7;

    target0: THREE.Vector3;
    position0: THREE.Vector3;
    zoom0: number;

    private state = STATE.NONE;
    private EPS = 0.0001;
    private spherical = new THREE.Spherical();
    private sphericalDelta = new THREE.Spherical();
    private scale = 1;
    private panOffset = new THREE.Vector3();
    private zoomChanged = false;
    private rotateStart = new THREE.Vector2();
    private rotateEnd = new THREE.Vector2();
    private rotateDelta = new THREE.Vector2();
    private panStart = new THREE.Vector2();
    private panEnd = new THREE.Vector2();
    private panDelta = new THREE.Vector2();
    private dollyStart = new THREE.Vector2();
    private dollyEnd = new THREE.Vector2();
    private dollyDelta = new THREE.Vector2();

    constructor(camera: Camera, private canvas: HTMLCanvasElement) {
        this.camera = camera.camera;
        this.position0 = this.camera.position.clone();
        this.target0 = this.target.clone();
        this.zoom0 = this.camera.zoom;
        canvas.addEventListener('mousedown', this.onMouseDown, false);
        canvas.addEventListener('wheel', this.onMouseWheel, false);
        canvas.addEventListener('touchstart', this.onTouchStart, false);
        canvas.addEventListener('touchend', this.onTouchEnd, false);
        canvas.addEventListener('touchmove', this.onTouchMove, false);
    }

    clean = () => {
        this.canvas.removeEventListener('mousedown', this.onMouseDown, false);
        this.canvas.removeEventListener('wheel', this.onMouseWheel, false);
        this.canvas.removeEventListener('touchstart', this.onTouchStart, false);
        this.canvas.removeEventListener('touchend', this.onTouchEnd, false);
        this.canvas.removeEventListener('touchmove', this.onTouchMove, false);
        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, false);
    }

    getZoomScale = () => {
        return Math.pow(0.95, this.zoomSpeed);
    }

    reset = () => {
        this.target.copy(this.target0);
        this.camera.position.copy(this.position0);
        this.camera.zoom = this.zoom0;

        this.camera.updateProjectionMatrix();
        this.update();

        this.state = STATE.NONE;
    }

    update = () => {
        const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 1, 0));
        const quatInverse = quat.clone().inverse();

        const lastQuaternion = new THREE.Quaternion();
        const lastPosition = new THREE.Vector3();
        const position = this.camera.position;
        const offset = new THREE.Vector3()
            .subVectors(position, this.target)
            .applyQuaternion(quat);

        this.spherical.setFromVector3(offset);

        this.spherical.theta += this.sphericalDelta.theta;
        this.spherical.phi += this.sphericalDelta.phi;

        this.spherical.phi = Math.max(0, Math.min(Math.PI, this.spherical.phi));
        this.spherical.makeSafe();
        this.spherical.radius *= this.scale;

        this.target.add(this.panOffset);

        offset.setFromSpherical(this.spherical);
        offset.applyQuaternion(quatInverse);

        position.copy(this.target).add(offset);

        this.camera.lookAt(this.target);

        this.scale = 1;
        this.panOffset.set(0, 0, 0);
        this.sphericalDelta.set(0, 0, 0);

        if (this.zoomChanged ||
            lastPosition.distanceToSquared(this.camera.position) > this.EPS ||
            8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > this.EPS
        ) {
            lastPosition.copy(this.camera.position);
            lastQuaternion.copy(this.camera.quaternion);
            this.zoomChanged = false;
        }
    }

    panLeft = (distance: number, objectMatrix: THREE.Matrix4) => {
        this.panOffset.add(new THREE.Vector3()
            .setFromMatrixColumn(objectMatrix, 0)
            .multiplyScalar(-distance));
    }

    panUp = (distance: number, objectMatrix: THREE.Matrix4) => {
        this.panOffset.add(new THREE.Vector3()
            .setFromMatrixColumn(objectMatrix, 1)
            .multiplyScalar(distance));
    }

    pan = (x: number, y: number) => {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            const dist = new THREE.Vector3()
                .subVectors(this.camera.position, this.target)
                .length()
                * Math.tan(this.camera.fov / 2 * Math.PI / 180.0);
            this.panLeft(2 * x * dist / this.canvas.clientHeight, this.camera.matrix);
            this.panUp(2 * y * dist / this.canvas.clientHeight, this.camera.matrix);
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            this.panLeft(
                x * (this.camera.right - this.camera.left) /
                this.camera.zoom / this.canvas.clientWidth,
                this.camera.matrix
            );
            this.panUp(
                y * (this.camera.top - this.camera.bottom) /
                this.camera.zoom / this.canvas.clientHeight,
                this.camera.matrix
            );
        }
    }

    dollyIn = (dollyScale: number) => {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.scale /= dollyScale;
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.zoom = Math.max(0,
                Math.min(Infinity, this.camera.zoom * dollyScale));
            this.camera.updateProjectionMatrix();
            this.zoomChanged = true;
        }
    }

    dollyOut = (dollyScale: number) => {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.scale *= dollyScale;
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.zoom = Math.max(0,
                Math.min(Infinity, this.camera.zoom / dollyScale));
            this.camera.updateProjectionMatrix();
            this.zoomChanged = true;
        }
    }

    handleRotate = (x: number, y: number) => {
        const rotateLeft = (angle: number) => this.sphericalDelta.theta -= angle;
        const rotateUp = (angle: number) => this.sphericalDelta.phi -= angle;

        this.rotateEnd.set(x, y);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
        rotateLeft(2 * Math.PI * this.rotateDelta.x / this.canvas.clientWidth * this.rotateSpeed);
        rotateUp(2 * Math.PI * this.rotateDelta.y / this.canvas.clientHeight * this.rotateSpeed);
        this.rotateStart.copy(this.rotateEnd);
        this.update();
    }

    handleMovePan(x: number, y: number) {
        this.panEnd.set(x, y);
        this.panDelta.subVectors(this.panEnd, this.panStart);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
        this.update();
    }

    handleMoveDolly = (x: number, y: number) => {
        this.dollyEnd.set(x, y);

        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

        if (this.dollyDelta.y > 0) {
            this.dollyIn(this.getZoomScale());
        } else if (this.dollyDelta.y < 0) {
            this.dollyOut(this.getZoomScale());
        }

        this.dollyStart.copy(this.dollyEnd);
        this.update();
    }

    onMouseDown = (event: MouseEvent) => {
        if (this.disabled) return;

        event.preventDefault();

        if (event.button === BUTTONS.ORBIT) {
            this.rotateStart.set(event.clientX, event.clientY);
            this.state = STATE.ROTATE;
        } else if (event.button === BUTTONS.ZOOM) {
            this.dollyStart.set(event.clientX, event.clientY);
            this.state = STATE.DOLLY;
        } else if (event.button === BUTTONS.PAN && event.altKey) {
            this.panStart.set(event.clientX, event.clientY);
            this.state = STATE.PAN;
        }

        if (this.state !== STATE.NONE) {
            document.addEventListener('mousemove', this.onMouseMove, false);
            document.addEventListener('mouseup', this.onMouseUp, true);
        }
    }

    onMouseMove = ({ clientX, clientY }: MouseEvent) => {
        if (this.disabled) return;

        if (this.state === STATE.ROTATE) {
            this.handleRotate(clientX, clientY);
        } else if (this.state === STATE.DOLLY) {
            this.handleMoveDolly(clientX, clientY);
        } else if (this.state === STATE.PAN) {
            this.handleMovePan(clientX, clientY);
        }
    }

    onMouseUp = () => {
        if (this.disabled) return;

        document.removeEventListener('mousemove', this.onMouseMove, false);
        document.removeEventListener('mouseup', this.onMouseUp, true);

        this.state = STATE.NONE;
    }

    onMouseWheel = (event: MouseWheelEvent) => {
        if (this.disabled) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.deltaY < 0) {
            this.dollyOut(this.getZoomScale());
        } else if (event.deltaY > 0) {
            this.dollyIn(this.getZoomScale());
        }
        this.update();
    }

    onTouchStart = (event: TouchEvent) => {
        if (this.disabled) return;

        event.preventDefault();
        event.stopPropagation();

        const touches = event.touches.length;
        const { pageX, pageY } = event.touches[0];

        if (touches === 1) {
            this.rotateStart.set(pageX, pageY);
        } else if (touches === 2) {
            const dx = pageX - event.touches[1].pageX;
            const dy = pageY - event.touches[1].pageY;
            this.dollyStart.set(0, Math.sqrt(dx * dx + dy * dy));
        } else if (touches === 3) {
            this.panStart.set(pageX, pageY);
        } else {
            this.state = STATE.NONE;
        }
    }

    onTouchMove = (event: TouchEvent) => {
        if (this.disabled) return;

        event.preventDefault();
        event.stopPropagation();

        const touches = event.touches.length;
        const { pageX, pageY } = event.touches[0];

        if (touches === 1) {
            this.handleRotate(pageX, pageY);
        } else if (touches === 2) {
            var dx = pageX - event.touches[1].pageX;
            var dy = pageY - event.touches[1].pageY;
            this.handleMoveDolly(0, Math.sqrt(dx * dx + dy * dy));
        } else if (touches === 3) {
            this.handleMovePan(pageX, pageY);
        } else {
            this.state = STATE.NONE;
        }
    }

    onTouchEnd = (event: TouchEvent) => {
        if (this.disabled) return;

        this.state = STATE.NONE;
    }
}