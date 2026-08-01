import { AlarmSound } from '../types/task';

class AudioService {
  private audioCtx: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private isRinging: boolean = false;
  private ringInterval: number | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play a short preview note or pattern for sound selection
  playPreview(sound: AlarmSound, volume: number = 0.8) {
    this.stopAlarm();
    this.playSoundOnce(sound, volume);
  }

  private playSoundOnce(sound: AlarmSound, volume: number = 0.8) {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      switch (sound) {
        case 'teal_chime': {
          // Soothing dual-frequency chime
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            
            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.3 * volume, now + idx * 0.12 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 1.25);
          });
          break;
        }

        case 'zen_gong': {
          // Warm resonant gong simulation
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(130.81, now); // C3
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(132.50, now); // Slightly detuned

          gain.gain.setValueAtTime(0.5 * volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2.6);
          osc2.stop(now + 2.6);
          break;
        }

        case 'digital_pulse': {
          // Energetic 3-beep pulse
          [880, 880, 1174.66].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            gain.gain.setValueAtTime(0.2 * volume, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.13);
          });
          break;
        }

        case 'morning_breeze': {
          // Serene melodic sweep
          const notes = [440, 554.37, 659.25, 880];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.2);

            gain.gain.setValueAtTime(0, now + idx * 0.2);
            gain.gain.linearRampToValueAtTime(0.35 * volume, now + idx * 0.2 + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.8);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.2);
            osc.stop(now + idx * 0.2 + 0.85);
          });
          break;
        }
      }
    } catch (e) {
      console.error('Web Audio API error during playback:', e);
    }
  }

  // Start repeating alarm sound until user acts
  startRepeatingAlarm(sound: AlarmSound = 'teal_chime', volume: number = 0.8) {
    if (this.isRinging) return;
    this.isRinging = true;

    // Play immediately
    this.playSoundOnce(sound, volume);

    // Repeat every 2.5 seconds
    this.ringInterval = window.setInterval(() => {
      if (this.isRinging) {
        this.playSoundOnce(sound, volume);
      } else {
        this.stopAlarm();
      }
    }, 2500);
  }

  stopAlarm() {
    this.isRinging = false;
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Ignore stopped oscillators
      }
    });
    this.activeOscillators = [];
  }
}

export const audioService = new AudioService();
