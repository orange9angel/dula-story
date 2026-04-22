/**
 * Story Bootstrap
 * Registers official assets from dula-assets and any custom Story plugins.
 */
import { registerAll } from 'dula-assets';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// ---- GLTF Arena 示例（需要真实篮球场模型时启用）----
// import { GLTFArenaScene } from 'dula-assets';
// import { registerScene } from 'dula-engine';
//
// const MODEL_PATH = '/episode/assets/images/models/your_court_model.glb';
// class MyBasketballArena extends GLTFArenaScene {
//   constructor() {
//     super(MODEL_PATH, {
//       scale: 1,
//       offset: { x: 0, y: 0, z: 0 },
//       addProceduralStands: true,
//       addProceduralLights: true,
//     });
//     this.name = 'MyBasketballArena';
//   }
// }
// registerScene('BasketballArenaScene', MyBasketballArena);

// Optional: register custom Story plugins here
// import { registerCharacter } from 'dula-engine';
// import { MyHero } from './plugins/characters/MyHero.js';
// registerCharacter('MyHero', MyHero);
