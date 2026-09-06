import { AlarmSound } from '../types/task';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private isRinging = false;
  private ringInterval: number | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  private trackOscillator(oscillator: OscillatorNode): void {
    this.activeOscillators.push(oscillator);
    oscillator.addEventListener('ended', () => {
      this.activeOscillators = this.activeOscillators.filter(
        (candidate) => candidate !== oscillator,
      );
    });
  }

  playPreview(sound: AlarmSound, volume = 0.8): void {
    this.stopAlarm();
    this.playSoundOnce(sound, volume);
  }

  private playSoundOnce(sound: AlarmSound, volume = 0.8): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      switch (sound) {
        case 'teal_chime': {
          [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const startAt = now + index * 0.12;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0, startAt);
            gain.gain.linearRampToValueAtTime(0.3 * volume, startAt + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 1.2);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            this.trackOscillator(oscillator);
            oscillator.start(startAt);
            oscillator.stop(startAt + 1.25);
          });
          break;
        }

        case 'zen_gong': {
          const oscillatorOne = ctx.createOscillator();
          const oscillatorTwo = ctx.createOscillator();
          const gain = ctx.createGain();

          oscillatorOne.type = 'sine';
          oscillatorOne.frequency.setValueAtTime(130.81, now);
          oscillatorTwo.type = 'triangle';
          oscillatorTwo.frequency.setValueAtTime(132.5, now);

          gain.gain.setValueAtTime(0.5 * volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

          oscillatorOne.connect(gain);
          oscillatorTwo.connect(gain);
          gain.connect(ctx.destination);
          this.trackOscillator(oscillatorOne);
          this.trackOscillator(oscillatorTwo);
          oscillatorOne.start(now);
          oscillatorTwo.start(now);
          oscillatorOne.stop(now + 2.6);
          oscillatorTwo.stop(now + 2.6);
          break;
        }

        case 'digital_pulse': {
          [880, 880, 1174.66].forEach((frequency, index) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const startAt = now + index * 0.18;

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.2 * volume, startAt);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.12);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            this.trackOscillator(oscillator);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.13);
          });
          break;
        }

        case 'morning_breeze': {
          [440, 554.37, 659.25, 880].forEach((frequency, index) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            const startAt = now + index * 0.2;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0, startAt);
            gain.gain.linearRampToValueAtTime(0.35 * volume, startAt + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.8);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            this.trackOscillator(oscillator);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.85);
          });
          break;
        }
      }
    } catch (error) {
      console.error('Web Audio API error during playback:', error);
    }
  }

  startRepeatingAlarm(sound: AlarmSound = 'teal_chime', volume = 0.8): void {
    if (this.isRinging) return;

    this.isRinging = true;
    this.playSoundOnce(sound, volume);
    this.ringInterval = window.setInterval(() => {
      if (this.isRinging) {
        this.playSoundOnce(sound, volume);
      }
    }, 2500);
  }

  stopAlarm(): void {
    this.isRinging = false;

    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }

    const oscillators = [...this.activeOscillators];
    this.activeOscillators = [];

    oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // It may already have reached its scheduled stop time.
      }
    });
  }
}

export const audioService = new AudioService();
