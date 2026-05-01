/**
 * Starlight Courier — Story Bootstrap
 * Registers official assets from dula-assets + custom scenes.
 */
import { registerAll } from 'dula-assets';
import { NightStreetScene } from './scenes/NightStreetScene.js';
import { NightRoomScene } from './scenes/NightRoomScene.js';
import { DrawerScene } from './scenes/DrawerScene.js';
import { TimeTunnelScene } from './scenes/TimeTunnelScene.js';
import { FutureCityScene } from './scenes/FutureCityScene.js';
import { registerScene } from 'dula-engine';

// Register all official assets (characters, animations, scenes, camera moves, voices)
registerAll();

// Register custom scenes for Starlight Courier
registerScene('NightStreetScene', NightStreetScene);
registerScene('NightRoomScene', NightRoomScene);
registerScene('DrawerScene', DrawerScene);
registerScene('TimeTunnelScene', TimeTunnelScene);
registerScene('FutureCityScene', FutureCityScene);
