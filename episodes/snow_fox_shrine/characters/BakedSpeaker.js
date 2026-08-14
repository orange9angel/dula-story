import { CharacterBase } from 'dula-engine';

/**
 * Registry adapter for speakers/performers whose visible performance is baked
 * into the generated 2D keyframes. Same pattern as the reference episodes:
 * the Storyboard can schedule speech while the empty Three.js group stays
 * offstage and never overlays the art.
 */
class BakedSpeaker extends CharacterBase {
  constructor(name) {
    super(name);
    this.archetypes = ['voice-only', 'baked-visual'];
    this.boundingRadius = 0;
    this.mesh.visible = false;
    this.disableSpeakingBodyMotion = true;
    this.disableConversationMicroMotion = true;
  }

  build() {
    this.mesh.visible = false;
    this.mesh.userData.bakedVisual = true;
    this.mesh.userData.voiceOnly = true;
  }

  update(time) {
    if (this.isSpeaking && time >= this.speakEndTime) {
      this.stopSpeaking();
    }
  }
}

export class TsumugiBakedSpeaker extends BakedSpeaker {
  constructor() {
    super('Tsumugi');
    this.archetypes = ['humanoid', 'voice-only', 'baked-visual'];
  }
}

export class FoxBakedSpeaker extends BakedSpeaker {
  constructor() {
    super('Fox');
  }
}
