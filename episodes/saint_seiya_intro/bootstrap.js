import { registerAll } from 'dula-assets';
import { registerAnimation, registerScene, registerCameraMove } from 'dula-engine';
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
import { RetroTVPostProcess } from './postprocessing/RetroTVPostProcess.js';

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

// Setup retro TV post-processing after renderer is available
// This will be called from render.js after bootstrap loads
window.setupRetroPostProcess = function(renderer) {
  if (!renderer) return null;
  const retroEffect = new RetroTVPostProcess(renderer, 1920, 1080);
  // Fine-tune for Saint Seiya 80s cel anime look
  retroEffect.setGrainIntensity(0.08);
  retroEffect.setScanlineIntensity(0.22);
  retroEffect.setScanlineDensity(2.2);
  retroEffect.setChromaticIntensity(0.0025);
  retroEffect.setVignetteIntensity(0.32);
  retroEffect.setContrast(1.28);
  retroEffect.setSaturation(1.05);
  retroEffect.setWarmTint(0.45);
  retroEffect.setCrtCurve(0.018);
  retroEffect.setPosterizeLevels(5.0);
  retroEffect.setOutlineStrength(0.4);
  return retroEffect;
};
