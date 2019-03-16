import Object3D from "./object";

import { Appearance, Sphere } from "./appearance";

export default class Generator extends Object3D {
    private intervalHandle;
    constructor(interval: number, onCreateObject: any, appearance?: Appearance, x = 0, y = 0) {
        super(appearance, undefined, x, y, 0, true)
        this.intervalHandle = setInterval(() => {
            onCreateObject(new Object3D(new Sphere(), undefined, this.mesh.position.x, this.mesh.position.y), false);
        }, interval);
    }

    clean() {
        super.clean();
        clearInterval(this.intervalHandle);
    }
}