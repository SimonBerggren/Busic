import * as React from "react";

import SoundEffect from "./sound-effect";
import Object3D from "./object";
import Generator from "./generator";

import { Kick, HighHat, Snare, Drum } from "./drums";
import { Box, Sphere } from "./appearance";

declare interface onCreateObject { (object: Object3D, attach?): void };
declare interface onClick { (e: React.MouseEvent): void };

class Button extends React.Component<{ onClick: onClick, text: string }> {
    render = () => {
        const { onClick, text } = this.props;
        return (
            <div className="row">
                <div>
                    <input onClick={onClick} value={text} type="button" />
                </div>
            </div>
        )
    }
}

export default class LeftPanel extends React.Component<{ onClick?: onClick, onMouseDown?: onClick, onCreateObject: onCreateObject }> {

    private bpm: HTMLInputElement;

    onFocus = () => this.bpm.select();

    onBlur = () => {
        const { min, max, valueAsNumber } = this.bpm;
        this.bpm.value = Math.max(parseInt(min), Math.min(valueAsNumber, parseInt(max))).toString();
    }

    onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            this.bpm.blur();
        }
    }

    render = () => {
        const { onClick, onMouseDown, onCreateObject } = this.props;

        const drum = (drum: Drum) => new Object3D(new Box(), drum, 0, 0, 45, true);
        const gen = () => new Generator(60 / this.bpm.valueAsNumber * 1000, onCreateObject, new Box());

        return (
            <div className="panel"
                onMouseDown={onMouseDown}
                onContextMenu={onClick}
                onClick={onClick}
            >
                <h1>Busic</h1>
                <span>BPM: <input onFocus={this.onFocus} onKeyDown={this.onKeyDown} onBlur={this.onBlur} ref={r => this.bpm = r} type="number" min="1" max="380" defaultValue="60" required /></span>
                <Button onClick={e => onCreateObject(gen())} text={"Create Generator"} />
                <Button onClick={e => onCreateObject(drum(new HighHat()))} text={"Create HighHat"} />
                <Button onClick={e => onCreateObject(drum(new Snare()))} text={"Create Snare"} />
                <Button onClick={e => onCreateObject(drum(new Kick()))} text={"Create Kick"} />

            </div >
        )
    }
}