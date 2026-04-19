/**
 * Story Bootstrap
 * Registers official assets from dula-assets and any custom Story plugins.
 */
import { registerAll } from 'dula-assets';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// Optional: register custom Story plugins here
// import { registerCharacter } from 'dula-engine';
// import { MyHero } from './plugins/characters/MyHero.js';
// registerCharacter('MyHero', MyHero);
