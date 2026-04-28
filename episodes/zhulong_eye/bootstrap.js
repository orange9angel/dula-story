/**
 * Story Bootstrap for 烛龙睁眼 (Zhulong Eye Opening)
 * Registers official assets + custom episode scenes, characters, and animations.
 */
import { registerAll } from 'dula-assets';
import { registerScene, registerCharacter, registerAnimation } from 'dula-engine';

// Custom episode assets
import { DarkMountainScene } from './scenes/DarkMountainScene.js';
import { Zhulong } from './characters/Zhulong.js';
import { EyeOpen } from './animations/EyeOpen.js';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// Register custom Zhulong episode assets
registerScene('DarkMountainScene', DarkMountainScene);
registerCharacter('Zhulong', Zhulong);
registerAnimation('EyeOpen', EyeOpen);
