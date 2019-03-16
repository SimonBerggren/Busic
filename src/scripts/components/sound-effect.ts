export default class SoundEffect {
    
    audio: HTMLAudioElement;

    constructor(name: string) {
        this.audio = new Audio(`./assets/audio/${name}.wav`);
        this.play(false);
    }

    play(restart: boolean) {
        if (this.audio.paused)
            this.audio.play();
        else if (restart)
            this.audio.currentTime = 0;
    }
}