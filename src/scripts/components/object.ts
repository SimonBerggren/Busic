import * as CANNON from "cannon";
import * as THREE from "three";

import { generateID } from "../utils/utils";
import { Appearance } from "./appearance";
import { Drum } from "./drums";

export default class Object3D {
    protected shape: CANNON.Shape;
    private asleep = false;
    private audio?: Drum;

    body?: CANNON.Body;
    mesh?: THREE.Mesh;
    id: string;

    constructor(appearance?: Appearance, audio?: Drum, x = 0, y = 0, rotation = 0, private isStatic = false) {
        this.body = new CANNON.Body({ mass: isStatic ? 0 : 1 });
        this.id = generateID();
        this.setPosition(x, y);
        audio && this.setAudio(audio);
        appearance && this.setAppearance(appearance);
        this.setRotation(rotation);
        this.body.addEventListener("collide", this.onCollision);
    }

    clean() {
        this.body.removeEventListener("collide", this.onCollision);
    }

    onCollision = ({ contact }: any) => {
        if (this.isStatic && this.audio) {
            contact.restitution = 1;
            this.audio.play();
        }
    }

    setAudio = (audio: Drum) => {
        this.audio = audio;
        this.audio.play();
    }

    setAppearance = ({ shape, mesh }: Appearance) => {
        this.shape = shape;
        this.body.addShape(this.shape);
        this.mesh = mesh;
    }

    setPosition = (x: number, y: number, z = 0) => {
        this.body.position.set(x, y, z);
    }

    setRotation = (rotation: number) => {
        this.body.quaternion.setFromEuler(0, 0, rotation);
    }

    sleep = () => {
        this.asleep = true;
        this.body.mass = 0;
        this.stop();
    }

    wake = () => {
        this.asleep = false;
    }

    update = () => {
        this.copyPos(this.body, this.mesh);
        this.copyQuat(this.body, this.mesh);
        if (this.asleep) {
            this.stop();
        }
    }

    updateReverse = () => {
        this.copyPos(this.mesh, this.body);
        this.copyQuat(this.mesh, this.body);
    }

    private stop = () => {
        this.body.force.setZero();
        this.body.torque.setZero();
        this.body.inertia.setZero();
        this.body.velocity.setZero();
        this.body.angularVelocity.setZero();
    }

    private copyPos = (from: THREE.Mesh | CANNON.Body, to: THREE.Mesh | CANNON.Body) => {
        const { x, y, z } = from.position;
        to.position.set(x, y, z);
    }

    private copyQuat = (from: THREE.Mesh | CANNON.Body, to: THREE.Mesh | CANNON.Body) => {
        const { x, y, z, w } = from.quaternion;
        to.quaternion.set(x, y, z, w);
    }
}