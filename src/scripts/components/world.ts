import * as CANNON from "cannon";

export default class World extends CANNON.World {
    private timeStep = 1 / 60;

    constructor() {
        super();
        this.broadphase = new CANNON.NaiveBroadphase();
        this.gravity = new CANNON.Vec3(0, -10, 0);
        this.solver.iterations = 10;
    }

    step = () => {
        super.step(this.timeStep);
    }
}