import * as React from "react";

import LeftPanel from "./left-panel";
import Object3D from "./object";
import Scene from "./scene";

import { preventDefault } from "../utils/utils";

export default class App extends React.Component {
    private canvas: HTMLCanvasElement;
    private scene: Scene;

    componentDidMount = () => {
        window.addEventListener("contextmenu", e => preventDefault);
        this.scene = new Scene(this.canvas);
        this.scene.startRender();
    }

    componentWillUnmount = () => {
        window.removeEventListener("contextmenu", preventDefault);
        this.scene.clean();
    }

    onCreateObject = (object: Object3D) => {
        this.scene.add(object);
    }

    render = () => {
        return (
            <div className="app" onContextMenu={preventDefault}>
                <canvas className="canvas" ref={canvas => this.canvas = canvas} />
                <LeftPanel
                    onCreateObject={this.onCreateObject}
                />
            </div>
        )
    }
}