import * as CANNON from "cannon";
import * as THREE from "three";

import CameraController from "./camera-controller";

class GizmoMaterial extends THREE.MeshBasicMaterial {

    private oldColor = this.color.clone();
    private oldOpacity = this.opacity;

    constructor(params?: THREE.MeshBasicMaterialParameters) {
        super(params);
        this.depthTest = false;
        this.depthWrite = false;
        this.transparent = true;
    }

    highlight = (highlighted: boolean) => {
        if (highlighted) {
            this.color.setRGB(1, 1, 0);
            this.opacity = 1;
        } else {
            this.color.copy(this.oldColor);
            this.opacity = this.oldOpacity;
        }
    }
}

class GizmoLineMaterial extends THREE.LineBasicMaterial {

    private oldColor = this.color.clone();
    private oldOpacity = this.opacity;

    constructor(params?: THREE.LineBasicMaterialParameters) {
        super(params);
        this.depthTest = false;
        this.depthWrite = false;
        this.transparent = true;
        this.linewidth = 1;
    }

    highlight = (highlighted: boolean) => {
        if (highlighted) {
            this.color.setRGB(1, 1, 0);
            this.opacity = 1;
        } else {
            this.color.copy(this.oldColor);
            this.opacity = this.oldOpacity;
        }
    }
}

declare interface Gizmos { X: any[], Y: any[], Z: any[], XY: any[], YZ: any[], XZ: any[], XYZ: any[] };

const SPACE = {
    LOCAL: "local",
    WORLD: "world"
}

class TransformGizmo extends THREE.Object3D {

    protected pickerMaterial = new GizmoMaterial({ visible: false, transparent: false });

    protected handles = new THREE.Object3D();
    protected pickers = new THREE.Object3D();
    protected planes = new THREE.Object3D();

    protected handleGizmos: Gizmos;
    protected pickerGizmos: Gizmos;


    activePlane: THREE.Object3D;

    protected init() {
        const geometry = new THREE.PlaneBufferGeometry(50, 50, 2, 2);
        const material = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, color: "green" });

        const planes = {
            XY: new THREE.Mesh(geometry, material),
            YZ: new THREE.Mesh(geometry, material),
            XZ: new THREE.Mesh(geometry, material),
            XYZE: new THREE.Mesh(geometry, material)
        };

        planes.YZ.rotation.set(0, Math.PI / 2, 0);
        planes.XZ.rotation.set(-Math.PI / 2, 0, 0);

        for (const p in planes) {
            planes[p].name = p;
            this.planes.add(planes[p]);
            this.planes[p] = planes[p];
        }

        this.setupGizmos(this.handleGizmos, this.handles);
        this.setupGizmos(this.pickerGizmos, this.pickers);
        this.resetTransforms();

        this.add(this.handles, this.pickers, this.planes);
        this.activePlane = planes.XYZE;
    }

    private setupGizmos = (gizmos: Gizmos, parent: THREE.Object3D) => {
        for (const g in gizmos) {
            for (let i = gizmos[g].length; i--;) {
                const object = gizmos[g][i][0];
                const position = gizmos[g][i][1];
                const rotation = gizmos[g][i][2];

                object.name = g;

                position && object.position.set(position[0], position[1], position[2]);
                rotation && object.rotation.set(rotation[0], rotation[1], rotation[2]);

                parent.add(object);
            }
        }
    }

    private resetTransforms = () => {
        this.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                obj.updateMatrix();

                const geometry = obj.geometry.clone();
                geometry.applyMatrix(obj.matrix);
                obj.geometry = geometry;

                obj.position.set(0, 0, 0);
                obj.rotation.set(0, 0, 0);
                obj.scale.set(1, 1, 1);
            }
        });
    }

    update = (rotation: THREE.Euler, eye: THREE.Vector3) => {
        const vec1 = new THREE.Vector3(0, 0, 0);
        const vec2 = new THREE.Vector3(0, 1, 0);
        const lookAtMatrix = new THREE.Matrix4();

        this.traverse(function (child) {
            if (child.name.search('E') !== -1) {
                child.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(eye, vec1, vec2));
            } else if (
                child.name.search('X') !== -1 ||
                child.name.search('Y') !== -1 ||
                child.name.search('Z') !== -1
            ) {
                child.quaternion.setFromEuler(rotation);
            }
        });
    }
}

class TransformGizmoTranslate extends TransformGizmo {

    constructor() {
        super();
        this.init();
    }

    setActivePlane = (axis: string, eye: THREE.Vector3) => {
        const tempMatrix = new THREE.Matrix4();
        eye.applyMatrix4(
            tempMatrix.getInverse(tempMatrix.extractRotation(this.planes['XY'].matrixWorld))
        );

        if (axis === 'X') {
            this.activePlane = this.planes['XY'];

            if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes['XZ'];
        }

        if (axis === 'Y') {
            this.activePlane = this.planes['XY'];

            if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes['YZ'];
        }

        if (axis === 'Z') {
            this.activePlane = this.planes['XZ'];

            if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes['YZ'];
        }

        if (axis === 'XYZ') this.activePlane = this.planes['XYZE'];

        if (axis === 'XY') this.activePlane = this.planes['XY'];

        if (axis === 'YZ') this.activePlane = this.planes['YZ'];

        if (axis === 'XZ') this.activePlane = this.planes['XZ'];
    }

    protected init() {
        const geometry = new THREE.Geometry();
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.05, 0.2, 12, 1, false));
        mesh.position.y = 0.5;
        mesh.updateMatrix();

        geometry.merge(mesh.geometry as THREE.Geometry, mesh.matrix);

        const xGeometry = new THREE.BufferGeometry();
        xGeometry.addAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));

        const yGeometry = new THREE.BufferGeometry();
        yGeometry.addAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));

        const zGeometry = new THREE.BufferGeometry();
        zGeometry.addAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3));

        this.handleGizmos = {
            X: [
                [new THREE.Mesh(geometry, new GizmoMaterial({ color: 0xff0000 })),
                [0.5, 0, 0], [0, 0, -Math.PI / 2]],
                [new THREE.Line(xGeometry, new GizmoLineMaterial({ color: 0xff0000 }))]
            ],

            Y: [
                [new THREE.Mesh(geometry, new GizmoMaterial({ color: 0x00ff00 })), [0, 0.5, 0]],
                [new THREE.Line(yGeometry, new GizmoLineMaterial({ color: 0x00ff00 }))]
            ],

            Z: [
                [new THREE.Mesh(geometry, new GizmoMaterial({ color: 0x0000ff })),
                [0, 0, 0.5], [Math.PI / 2, 0, 0]],
                [new THREE.Line(zGeometry, new GizmoLineMaterial({ color: 0x0000ff }))]
            ],

            XYZ: [
                [new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0),
                    new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })),
                [0, 0, 0], [0, 0, 0]]
            ],

            XY: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29),
                    new GizmoMaterial({ color: 0x000000, opacity: 0.5 })),
                [0.15, 0.15, 0]]
            ],

            YZ: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29),
                    new GizmoMaterial({ color: 0x00ffff, opacity: 0.25 })),
                [0, 0.15, 0.15], [0, Math.PI / 2, 0]]
            ],

            XZ: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29),
                    new GizmoMaterial({ color: 0xff00ff, opacity: 0.25 })),
                [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]]
            ]
        };

        this.pickerGizmos = {
            X: [
                [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), this.pickerMaterial),
                [0.6, 0, 0], [0, 0, -Math.PI / 2]]
            ],

            Y: [
                [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), this.pickerMaterial),
                [0, 0.6, 0]]
            ],

            Z: [
                [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), this.pickerMaterial),
                [0, 0, 0.6], [Math.PI / 2, 0, 0]]
            ],

            XYZ: [
                [new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.pickerMaterial)]
            ],

            XY: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), this.pickerMaterial),
                [0.2, 0.2, 0]]
            ],

            YZ: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), this.pickerMaterial),
                [0, 0.2, 0.2], [0, Math.PI / 2, 0]]
            ],

            XZ: [
                [new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), this.pickerMaterial),
                [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]
            ]
        };

        super.init();
    }
}

const MODE = {
    TRANSLATE: "translate",
    ROTATE: "rotate",
    SCALE: "scale"
}

export default class ObjectController extends THREE.Object3D {

    object: THREE.Object3D;
    body: CANNON.Body;
    translationSnap: number;
    rotationSnap: number;
    space = SPACE.WORLD;
    size = 0.5;
    axis = null;

    private mode = MODE.TRANSLATE;

    private parentRotationMatrix = new THREE.Matrix4();
    private parentScale = new THREE.Vector3();

    private worldPosition = new THREE.Vector3();
    private worldRotation = new THREE.Euler();
    private worldRotationMatrix = new THREE.Matrix4();

    private camPosition = new THREE.Vector3();
    private camRotation = new THREE.Euler();
    private oldPosition = new THREE.Vector3();
    private oldScale = new THREE.Vector3();
    private oldRotationMatrix = new THREE.Matrix4();
    private oldMousePos: THREE.Vector3;
    private dragging = false;
    private gizmos = {
        translate: new TransformGizmoTranslate()
    };

    private offset = new THREE.Vector3();
    private point = new THREE.Vector3();
    private eulerPoint = new THREE.Euler();

    private ray = new THREE.Raycaster();
    private pointerVector = new THREE.Vector2();
    private tempRotation = new THREE.Vector3();
    private offsetRotation = new THREE.Vector3();
    private tempScale = 1;

    private lookAtMatrix = new THREE.Matrix4();
    private eye = new THREE.Vector3();

    private tempMatrix = new THREE.Matrix4();
    private tempVector = new THREE.Vector3();
    private tempQuaternion = new THREE.Quaternion();
    private unitX = new THREE.Vector3(1, 0, 0);;
    private unitY = new THREE.Vector3(0, 1, 0);
    private unitZ = new THREE.Vector3(0, 0, 1);

    private quaternionXYZ = new THREE.Quaternion();
    private quaternionX = new THREE.Quaternion();
    private quaternionY = new THREE.Quaternion();
    private quaternionZ = new THREE.Quaternion();
    private quaternionE = new THREE.Quaternion();

    constructor(private cameraController: CameraController, private canvas: HTMLCanvasElement) {
        super();
        this.visible = false;

        for (const g in this.gizmos) {
            const obj = this.gizmos[g];
            obj.visible = g === this.mode;
            this.add(obj);
        }

        canvas.addEventListener('mousedown', this.onPointerDown, false);
        canvas.addEventListener('touchstart', this.onPointerDown, false);

        canvas.addEventListener('mousemove', this.onPointerHover, false);
        canvas.addEventListener('touchmove', this.onPointerHover, false);

        canvas.addEventListener('mousemove', this.onPointerMove, false);
        canvas.addEventListener('touchmove', this.onPointerMove, false);

        canvas.addEventListener('mouseup', this.onPointerUp, false);
        canvas.addEventListener('mouseout', this.onPointerUp, false);
        canvas.addEventListener('touchend', this.onPointerUp, false);
        canvas.addEventListener('touchcancel', this.onPointerUp, false);
        canvas.addEventListener('touchleave', this.onPointerUp, false);
    }

    clean = () => {
        this.canvas.removeEventListener('mousedown', this.onPointerDown, false);
        this.canvas.removeEventListener('touchstart', this.onPointerDown, false);

        this.canvas.removeEventListener('mousemove', this.onPointerHover, false);
        this.canvas.removeEventListener('touchmove', this.onPointerHover, false);

        this.canvas.removeEventListener('mousemove', this.onPointerMove, false);
        this.canvas.removeEventListener('touchmove', this.onPointerMove, false);

        this.canvas.removeEventListener('mouseup', this.onPointerUp, false);
        this.canvas.removeEventListener('mouseout', this.onPointerUp, false);
        this.canvas.removeEventListener('touchend', this.onPointerUp, false);
        this.canvas.removeEventListener('touchcancel', this.onPointerUp, false);
        this.canvas.removeEventListener('touchleave', this.onPointerUp, false);
    }

    attach = (object: THREE.Object3D, body: CANNON.Body) => {
        this.object = object;
        this.body = body;
        this.visible = true;
        this.update();
    }

    detach = () => {
        this.object = undefined;
        this.body = undefined;
        this.axis = undefined;
        this.visible = false;
    }

    getMode = () => this.mode;

    setMode = (newMode: string) => {
        this.mode = newMode;

        if (newMode === MODE.SCALE) this.space = SPACE.LOCAL;

        for (const g in this.gizmos) this.gizmos[g].visible = g === newMode;

        this.updateMatrix();
    }

    update = () => {
        if (!this.object) return;

        this.object.updateMatrixWorld(false);
        this.worldPosition.setFromMatrixPosition(this.object.matrixWorld);
        this.worldRotation.setFromRotationMatrix(
            this.tempMatrix.extractRotation(this.object.matrixWorld));

        this.cameraController.camera.updateMatrixWorld(false);
        this.camPosition.setFromMatrixPosition(this.cameraController.camera.matrixWorld);
        this.camRotation.setFromRotationMatrix(
            this.tempMatrix.extractRotation(this.cameraController.camera.matrixWorld));

        this.tempScale = this.worldPosition.distanceTo(this.camPosition) / 6 * this.size;
        this.position.copy(this.worldPosition);
        this.scale.set(this.tempScale, this.tempScale, this.tempScale);

        if (this.cameraController.camera instanceof THREE.PerspectiveCamera) {
            this.eye
                .copy(this.camPosition)
                .sub(this.worldPosition)
                .normalize();
        } else if (this.cameraController.camera instanceof THREE.OrthographicCamera) {
            this.eye.copy(this.camPosition).normalize();
        }

        if (this.space === SPACE.LOCAL) {
            this.gizmos[this.mode].update(this.worldRotation, this.eye);
        } else if (this.space === SPACE.WORLD) {
            this.gizmos[this.mode].update(new THREE.Euler(), this.eye);
        }

        if (this.mode !== MODE.TRANSLATE)
            this.gizmos[this.mode].highlight(this.axis);
    }

    private intersectObjects = (x: number, y: number, objects: THREE.Object3D[]) => {
        const rect = this.canvas.getBoundingClientRect();
        const _x = (x - rect.left) / rect.width;
        const _y = (y - rect.top) / rect.height;

        this.pointerVector.set(_x * 2 - 1, -(_y * 2) + 1);
        this.ray.setFromCamera(this.pointerVector, this.cameraController.camera);

        var intersections = this.ray.intersectObjects(objects, true);
        return intersections.length ? intersections[0] : undefined;
    }

    private onPointerHover = (event: MouseEvent | TouchEvent) => {
        if (!this.object || this.dragging ||
            (event instanceof MouseEvent && event.button !== 0))
            return;

        const { clientX, clientY } = event instanceof TouchEvent ? event.changedTouches[0] : event;
        const intersect = this.intersectObjects(clientX, clientY, this.gizmos[this.mode].pickers.children);
        let axis = undefined;

        this.cameraController.disabled = false;

        if (intersect) {
            axis = intersect.object.name;
            event.preventDefault();
        }
        if (this.axis !== axis) {
            this.axis = axis;
            this.update();
        }
    }

    private onPointerDown = (event: MouseEvent | TouchEvent) => {
        if (!this.object || this.dragging ||
            (event instanceof MouseEvent && event.button !== 0))
            return;

        const { clientX, clientY } = event instanceof TouchEvent ? event.changedTouches[0] : event;

        var intersect = this.intersectObjects(clientX, clientY, this.gizmos[this.mode].pickers.children);

        if (intersect) {
            this.cameraController.disabled = true;

            event.preventDefault();
            event.stopPropagation();

            this.axis = intersect.object.name;

            this.update();

            this.eye
                .copy(this.camPosition)
                .sub(this.worldPosition)
                .normalize();

            this.gizmos[this.mode].setActivePlane(this.axis, this.eye);

            var planeIntersect = this.intersectObjects(clientX, clientY, [this.gizmos[this.mode].activePlane]);

            if (planeIntersect) {
                this.oldPosition.copy(this.object.position);
                this.oldScale.copy(this.object.scale);

                this.oldRotationMatrix.extractRotation(this.object.matrix);
                this.worldRotationMatrix.extractRotation(this.object.matrixWorld);

                this.parentRotationMatrix.extractRotation(this.object.parent.matrixWorld);
                this.parentScale.setFromMatrixScale(this.tempMatrix.getInverse(this.object.parent.matrixWorld));

                this.offset.copy(planeIntersect.point);
            }

            this.dragging = true;
        }
    }

    private onPointerMove = (event: MouseEvent | TouchEvent) => {
        if (!this.object || !this.axis || !this.dragging ||
            (event instanceof MouseEvent && event.button !== 0))
            return;

        const { clientX, clientY } = event instanceof TouchEvent ? event.changedTouches[0] : event;

        const planeIntersect = this.intersectObjects(clientX, clientY, [this.gizmos[this.mode].activePlane]);

        if (!planeIntersect) return;

        event.preventDefault();
        event.stopPropagation();

        this.point.copy(planeIntersect.point);

        if (this.mode === MODE.TRANSLATE) {
            this.point.sub(this.offset);
            this.point.multiply(this.parentScale);

            if (this.space === SPACE.LOCAL) {
                this.point.applyMatrix4(this.tempMatrix.getInverse(this.worldRotationMatrix));

                if (this.axis.search('X') === -1) this.point.x = 0;
                if (this.axis.search('Y') === -1) this.point.y = 0;
                if (this.axis.search('Z') === -1) this.point.z = 0;

                this.point.applyMatrix4(this.oldRotationMatrix);

                this.object.position.copy(this.oldPosition);
                this.object.position.add(this.point);
            }

            if (this.space === SPACE.WORLD || this.axis.search('XYZ') !== -1) {
                if (this.axis.search('X') === -1) this.point.x = 0;
                if (this.axis.search('Y') === -1) this.point.y = 0;
                if (this.axis.search('Z') === -1) this.point.z = 0;

                this.point.applyMatrix4(this.tempMatrix.getInverse(this.parentRotationMatrix));
                this.body.position.set(this.oldPosition.x, this.oldPosition.y, this.oldPosition.z);
                this.body.position.copy(
                    this.body.position.vadd(
                        new CANNON.Vec3(this.point.x, this.point.y, this.point.z),
                        this.body.position
                    ));
                this.object.position.copy(this.oldPosition);
                this.object.position.add(this.point);
            }

            if (this.translationSnap) {
                if (this.space === SPACE.LOCAL) {
                    this.object.position.applyMatrix4(this.tempMatrix.getInverse(this.worldRotationMatrix));
                }

                if (this.axis.search('X') !== -1)
                    this.object.position.x =
                        Math.round(this.object.position.x / this.translationSnap) * this.translationSnap;
                if (this.axis.search('Y') !== -1)
                    this.object.position.y =
                        Math.round(this.object.position.y / this.translationSnap) * this.translationSnap;
                if (this.axis.search('Z') !== -1)
                    this.object.position.z =
                        Math.round(this.object.position.z / this.translationSnap) * this.translationSnap;

                if (this.space === SPACE.LOCAL) {
                    this.object.position.applyMatrix4(this.worldRotationMatrix);
                }
            }
        } else if (this.mode === MODE.SCALE) {
            this.point.sub(this.offset);
            this.point.multiply(this.parentScale);

            var scalingStep = 5;

            if (this.space === SPACE.LOCAL) {
                if (this.axis === 'XYZ') {
                    this.tempScale = (1 + this.point.y / Math.max(this.oldScale.x, this.oldScale.y, this.oldScale.z)) / scalingStep;

                    this.object.scale.x = this.oldScale.x + this.oldScale.x * this.tempScale;
                    this.object.scale.y = this.oldScale.y + this.oldScale.y * this.tempScale;
                    this.object.scale.z = this.oldScale.z + this.oldScale.z * this.tempScale;
                } else {
                    this.point.applyMatrix4(this.tempMatrix.getInverse(this.worldRotationMatrix));

                    if (this.axis === 'X')
                        this.object.scale.x =
                            this.oldScale.x + this.oldScale.x * (1 + this.point.x / this.oldScale.x) / scalingStep;
                    if (this.axis === 'Y')
                        this.object.scale.y =
                            this.oldScale.y + this.oldScale.y * (1 + this.point.y / this.oldScale.y) / scalingStep;
                    if (this.axis === 'Z')
                        this.object.scale.z =
                            this.oldScale.z + this.oldScale.z * (1 + this.point.z / this.oldScale.z) / scalingStep;
                }
            }
        } else if (this.mode === MODE.ROTATE) {
            this.point.sub(this.worldPosition);
            this.point.multiply(this.parentScale);
            this.tempVector.copy(this.offset).sub(this.worldPosition);
            this.tempVector.multiply(this.parentScale);

            if (this.axis === 'E') {
                this.point.applyMatrix4(this.tempMatrix.getInverse(this.lookAtMatrix));
                this.tempVector.applyMatrix4(this.tempMatrix.getInverse(this.lookAtMatrix));

                this.tempRotation.set(
                    Math.atan2(this.point.z, this.point.y),
                    Math.atan2(this.point.x, this.point.z),
                    Math.atan2(this.point.y, this.point.x)
                );
                this.offsetRotation.set(
                    Math.atan2(this.tempVector.z, this.tempVector.y),
                    Math.atan2(this.tempVector.x, this.tempVector.z),
                    Math.atan2(this.tempVector.y, this.tempVector.x)
                );

                this.tempQuaternion.setFromRotationMatrix(this.tempMatrix.getInverse(this.parentRotationMatrix));

                this.quaternionE.setFromAxisAngle(this.eye, this.tempRotation.z - this.offsetRotation.z);
                this.quaternionXYZ.setFromRotationMatrix(this.worldRotationMatrix);

                this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionE);
                this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionXYZ);

                this.object.quaternion.copy(this.tempQuaternion);
            } else if (this.axis === 'XYZE') {
                this.quaternionE.setFromEuler(
                    this.eulerPoint.setFromVector3(
                        this.point
                            .clone()
                            .cross(this.tempVector)
                            .normalize()
                    )
                );

                this.tempQuaternion.setFromRotationMatrix(this.tempMatrix.getInverse(this.parentRotationMatrix));
                this.quaternionX.setFromAxisAngle(this.eulerPoint.toVector3(), -this.point.clone().angleTo(this.tempVector));
                this.quaternionXYZ.setFromRotationMatrix(this.worldRotationMatrix);

                this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionX);
                this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionXYZ);

                this.object.quaternion.copy(this.tempQuaternion);
            } else if (this.space === SPACE.LOCAL) {
                this.point.applyMatrix4(this.tempMatrix.getInverse(this.worldRotationMatrix));

                this.tempVector.applyMatrix4(this.tempMatrix.getInverse(this.worldRotationMatrix));

                this.tempRotation.set(
                    Math.atan2(this.point.z, this.point.y),
                    Math.atan2(this.point.x, this.point.z),
                    Math.atan2(this.point.y, this.point.x)
                );
                this.offsetRotation.set(
                    Math.atan2(this.tempVector.z, this.tempVector.y),
                    Math.atan2(this.tempVector.x, this.tempVector.z),
                    Math.atan2(this.tempVector.y, this.tempVector.x)
                );

                this.quaternionXYZ.setFromRotationMatrix(this.oldRotationMatrix);

                if (this.rotationSnap !== null) {
                    this.quaternionX.setFromAxisAngle(
                        this.unitX,
                        Math.round((this.tempRotation.x - this.offsetRotation.x) / this.rotationSnap) * this.rotationSnap
                    );
                    this.quaternionY.setFromAxisAngle(
                        this.unitY,
                        Math.round((this.tempRotation.y - this.offsetRotation.y) / this.rotationSnap) * this.rotationSnap
                    );
                    this.quaternionZ.setFromAxisAngle(
                        this.unitZ,
                        Math.round((this.tempRotation.z - this.offsetRotation.z) / this.rotationSnap) * this.rotationSnap
                    );
                } else {
                    this.quaternionX.setFromAxisAngle(this.unitX, this.tempRotation.x - this.offsetRotation.x);
                    this.quaternionY.setFromAxisAngle(this.unitY, this.tempRotation.y - this.offsetRotation.y);
                    this.quaternionZ.setFromAxisAngle(this.unitZ, this.tempRotation.z - this.offsetRotation.z);
                }

                if (this.axis === 'X') this.quaternionXYZ.multiplyQuaternions(this.quaternionXYZ, this.quaternionX);
                if (this.axis === 'Y') this.quaternionXYZ.multiplyQuaternions(this.quaternionXYZ, this.quaternionY);
                if (this.axis === 'Z') this.quaternionXYZ.multiplyQuaternions(this.quaternionXYZ, this.quaternionZ);

                this.object.quaternion.copy(this.quaternionXYZ);
            } else if (this.space === SPACE.WORLD) {
                this.tempRotation.set(
                    Math.atan2(this.point.x, this.point.z),
                    Math.atan2(this.point.z, this.point.y),
                    Math.atan2(this.point.y, this.point.x)
                );
                this.offsetRotation.set(
                    Math.atan2(this.tempVector.z, this.tempVector.y),
                    Math.atan2(this.tempVector.x, this.tempVector.z),
                    Math.atan2(this.tempVector.y, this.tempVector.x)
                );

                this.tempQuaternion.setFromRotationMatrix(this.tempMatrix.getInverse(this.parentRotationMatrix));

                if (this.rotationSnap !== null) {
                    this.quaternionX.setFromAxisAngle(
                        this.unitX,
                        Math.round((this.tempRotation.x - this.offsetRotation.x) / this.rotationSnap) * this.rotationSnap
                    );
                    this.quaternionY.setFromAxisAngle(
                        this.unitY,
                        Math.round((this.tempRotation.y - this.offsetRotation.y) / this.rotationSnap) * this.rotationSnap
                    );
                    this.quaternionZ.setFromAxisAngle(
                        this.unitZ,
                        Math.round((this.tempRotation.z - this.offsetRotation.z) / this.rotationSnap) * this.rotationSnap
                    );
                } else {
                    this.quaternionX.setFromAxisAngle(this.unitX, this.tempRotation.x - this.offsetRotation.x);
                    this.quaternionY.setFromAxisAngle(this.unitY, this.tempRotation.y - this.offsetRotation.y);
                    this.quaternionZ.setFromAxisAngle(this.unitZ, this.tempRotation.z - this.offsetRotation.z);
                }

                this.quaternionXYZ.setFromRotationMatrix(this.worldRotationMatrix);

                if (this.axis === 'X') this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionX);
                if (this.axis === 'Y') this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionY);
                if (this.axis === 'Z') this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionZ);

                this.tempQuaternion.multiplyQuaternions(this.tempQuaternion, this.quaternionXYZ);

                this.object.quaternion.copy(this.tempQuaternion);
            }
        }

        this.update();
    }

    private onPointerUp = (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        if (event instanceof MouseEvent && event.button !== 0) return;

        this.dragging = false;

        if (event instanceof TouchEvent) {
            this.axis = null;
            this.update();
        } else {
            this.onPointerHover(event);
        }
    }

}