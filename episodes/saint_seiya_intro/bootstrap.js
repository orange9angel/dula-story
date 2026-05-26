import { registerAll } from 'dula-assets';
import { registerAnimation, registerScene, registerCameraMove, PostProcessRegistry } from 'dula-engine';
import { SanctuaryIntroScene } from './scenes/SanctuaryIntroScene.js';
import { PegasusCosmosIgnite } from './animations/PegasusCosmosIgnite.js';
import { PegasusMeteorPunch } from './animations/PegasusMeteorPunch.js';
import { PegasusStanceEnter } from './animations/PegasusStanceEnter.js';
import { PegasusClothShine } from './animations/PegasusClothShine.js';
import { PegasusDramaticPose } from './animations/PegasusDramaticPose.js';
import { PegasusTurnAndPoint } from './animations/PegasusTurnAndPoint.js';
import { PegasusRising } from './animations/PegasusRising.js';
import { SagittariusDescent } from './animations/SagittariusDescent.js';
import { SagittariusArrowDraw } from './animations/SagittariusArrowDraw.js';
import { SagittariusGoldenGlow } from './animations/SagittariusGoldenGlow.js';
import { DramaticLowAngle } from './camera/DramaticLowAngle.js';
import { SlowMotionOrbit } from './camera/SlowMotionOrbit.js';
import { QuickCutZoom } from './camera/QuickCutZoom.js';
import { HeroicRise } from './camera/HeroicRise.js';
import { GoldenReveal } from './camera/GoldenReveal.js';
import { DuelFrame } from './camera/DuelFrame.js';
import { ArrowFollow } from './camera/ArrowFollow.js';

registerAll();

// Register scene
registerScene('SanctuaryIntroScene', SanctuaryIntroScene);

// Register animations
registerAnimation('PegasusCosmosIgnite', PegasusCosmosIgnite);
registerAnimation('PegasusMeteorPunch', PegasusMeteorPunch);
registerAnimation('PegasusStanceEnter', PegasusStanceEnter);
registerAnimation('PegasusClothShine', PegasusClothShine);
registerAnimation('PegasusDramaticPose', PegasusDramaticPose);
registerAnimation('PegasusTurnAndPoint', PegasusTurnAndPoint);
registerAnimation('PegasusRising', PegasusRising);
registerAnimation('SagittariusDescent', SagittariusDescent);
registerAnimation('SagittariusArrowDraw', SagittariusArrowDraw);
registerAnimation('SagittariusGoldenGlow', SagittariusGoldenGlow);

// Register camera moves
registerCameraMove('DramaticLowAngle', DramaticLowAngle);
registerCameraMove('SlowMotionOrbit', SlowMotionOrbit);
registerCameraMove('QuickCutZoom', QuickCutZoom);
registerCameraMove('HeroicRise', HeroicRise);
registerCameraMove('GoldenReveal', GoldenReveal);
registerCameraMove('DuelFrame', DuelFrame);
registerCameraMove('ArrowFollow', ArrowFollow);

// Configure RetroTV post-processing for Saint Seiya 80s cel anime look.
// RetroTV is already registered in dula-assets/registerAll().
// We override the default parameters by patching the constructor.
const OriginalRetroTV = PostProcessRegistry['RetroTV'];
if (OriginalRetroTV) {
  PostProcessRegistry['RetroTV'] = class extends OriginalRetroTV {
    constructor(renderer, width, height) {
      super(renderer, width, height);
      this.setGrainIntensity(0.08);
      this.setScanlineIntensity(0.22);
      this.setScanlineDensity(2.2);
      this.setChromaticIntensity(0.0025);
      this.setVignetteIntensity(0.32);
      this.setContrast(1.28);
      this.setSaturation(1.05);
      this.setWarmTint(0.45);
      this.setCrtCurve(0.018);
      this.setPosterizeLevels(5.0);
      this.setOutlineStrength(0.4);
    }
  };
}
