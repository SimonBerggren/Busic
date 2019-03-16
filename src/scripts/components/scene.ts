import * as THREE from "three";
import TransformControls from "../lib/transform-controls";
import Settings from "../utils/settings";
import Object3D from "./object";
import Camera from "./camera";
import World from "./world";
import CameraController from "./camera-controller";
import ObjectController from "./object-controller";

export default class Scene {
    private renderer: THREE.WebGLRenderer;
    private cameraController: CameraController;
    private objectController: ObjectController;
    private world: World;
    private scene: THREE.Scene;
    private rendering = false;
    private controller: TransformControls;

    objects: Object3D[];
    camera: Camera;

    constructor(canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.camera = new Camera();
        this.cameraController = new CameraController(this.camera, canvas);
        this.objectController = new ObjectController(this.cameraController, canvas);
        this.controller = new TransformControls(this.camera.camera, canvas);

        this.controller.addEventListener("objectChange", () => {
            this.objects.forEach(obj => {
                if (obj.mesh.id === this.controller.getObject().id) {
                    obj.updateReverse();
                }
            });
        });

        this.scene.add(this.controller);

        this.world = new World();
        this.objects = [];

        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true, logarithmicDepthBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(Settings.renderer.clearColor, 0);

        const dcPoint = ({ clientX, clientY }: MouseEvent) => {
            var rect = canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left) / rect.width * 2 - 1,
                y: -(clientY - rect.top) / rect.height * 2 + 1
            };
        }

        canvas.addEventListener("click", e => {
            if (e.button === 0) {
                const ray = new THREE.Raycaster()
                ray.setFromCamera(dcPoint(e), this.camera.camera);
                if (!this.objects.some(obj => {
                    const intersect = ray.intersectObject(obj.mesh, true);
                    if (intersect.length) {
                        this.controller.detach();
                        this.controller.attach(obj.mesh);
                        return true;
                    }
                }))
                    this.controller.detach();
            }
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Delete") {
                const controlled = this.controller.getObject();
                if (controlled) {
                    for (let i = 0; i < this.objects.length; ++i) {
                        const obj = this.objects[i];
                        if (obj.mesh.id === controlled.id) {
                            this.remove(obj, i);
                            this.controller.detach();
                            break;
                        }
                    }
                }
            }
        });

        this.scene.add(new THREE.AmbientLight("white", 0.2));
        const l = new THREE.DirectionalLight("white", 1);
        l.position.set(0, 1, 1);
        this.scene.add(l);

        window.addEventListener("resize", this.resize);
    }

    screenToWorld = (x: number, y: number) => {
        return new THREE.Vector3(-window.innerWidth / 2 + x, window.innerHeight / 2 - y, -1)
            .unproject(this.camera.camera)
    }

    clean = () => {
        while (this.objects.length) {
            const obj = this.objects.pop();
            this.world.remove(obj.body);
            this.scene.remove(obj.mesh);
            obj.clean();
        }

        this.cameraController.clean();
        this.objectController.clean();

        window.removeEventListener("resize", this.resize);
    }

    add = (object: Object3D, attach = false) => {
        this.objects.push(object);
        this.scene.add(object.mesh);
        this.world.addBody(object.body);
        if (attach) {
            this.controller.detach();
            this.controller.attach(object.mesh);
        }
    }

    remove = (object: Object3D, index = 0) => {
        for (let i = index; i < this.objects.length; ++i) {
            const obj = this.objects[i];
            if (obj.id === object.id) {
                obj.clean();
                this.objects.splice(i, 1);
                this.world.remove(obj.body);
                this.scene.remove(obj.mesh);
                break;
            }
        }
    }

    resize = () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.update();
    }

    startRender = () => {
        if (!this.rendering && this.renderer) {
            this.rendering = true;
            this.render();
        }
    }

    stopRender = () => {
        this.rendering = false;
    }

    private render = () => {
        if (this.rendering) {
            requestAnimationFrame(this.render.bind(this));
            this.world.step();
            this.cameraController.update();
            this.camera.update();
            this.objects.forEach((object, index) => {
                if (!this.camera.canSeeObject(object)) {
                    this.remove(object, index);
                } else {
                    object.update();
                }
            });
            this.renderer.render(this.scene, this.camera.camera);
        }
    }
}