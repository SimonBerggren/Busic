import SoundEffect from "./sound-effect";

const drumAudio = {
    Kick: "kick",
    HighHat: "high-hat",
    Snare: "snare",
}

class Drum {
    protected audio: SoundEffect;
    play = () => {
        this.audio.play(true);
    }
}

class Kick extends Drum {
    audio = new SoundEffect(drumAudio.Kick);
}

class HighHat extends Drum {
    audio = new SoundEffect(drumAudio.HighHat);
}

class Snare extends Drum {
    audio = new SoundEffect(drumAudio.Snare);
}

export { Drum, Kick, HighHat, Snare };