import { CharacterBase } from 'dula-engine';

/**
 * Registry adapter for speakers whose visible performance is already baked
 * into the generated 2D keyframes. The Storyboard can still schedule speech,
 * while the empty Three.js group stays offstage and never overlays the art.
 */
class BakedSpeaker extends CharacterBase {
  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'voice-only', 'baked-visual'];
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

export class HigurashiBakedSpeaker extends BakedSpeaker {
  constructor() {
    super('Higurashi');
  }
}

export class BoyBakedSpeaker extends BakedSpeaker {
  constructor() {
    super('Boy');
  }
}
