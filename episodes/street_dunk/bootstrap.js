/**
 * Street Dunk Bootstrap
 * Registers official assets + custom StreetCourtScene, Skyler character, and animations
 */
import { registerAll } from 'dula-assets';
import { registerScene, registerCharacter, registerAnimation } from 'dula-engine';
import { StreetCourtScene } from './scenes/StreetCourtScene.js';
import { Skyler } from './characters/Skyler.js';
import { SkylerDunk } from './animations/SkylerDunk.js';
import { SkylerCelebrate } from './animations/SkylerCelebrate.js';

// Register all official assets
registerAll();

// Register custom scene
registerScene('StreetCourtScene', StreetCourtScene);

// Register custom character
registerCharacter('Skyler', Skyler);

// Register custom animations
registerAnimation('SkylerDunk', SkylerDunk);
registerAnimation('SkylerCelebrate', SkylerCelebrate);
