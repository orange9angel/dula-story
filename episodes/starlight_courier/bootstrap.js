/**
 * Starlight Courier — Story Bootstrap
 * Registers official assets from dula-assets + custom night scenes.
 */
import { registerAll } from 'dula-assets';
import { NightStreetScene } from './scenes/NightStreetScene.js';
import { NightRoomScene } from './scenes/NightRoomScene.js';
import { StarSkyScene } from './scenes/StarSkyScene.js';
import { registerScene } from 'dula-engine';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// Register custom night scenes for Starlight Courier
registerScene('NightStreetScene', NightStreetScene);
registerScene('NightRoomScene', NightRoomScene);
registerScene('StarSkyScene', StarSkyScene);
