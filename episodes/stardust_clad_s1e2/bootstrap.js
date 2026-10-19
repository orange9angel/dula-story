// Registry for authoring/validation. Production entry: viewer_palace.js.
import {registerAll} from 'dula-assets';
import {registerCharacter,registerScene} from 'dula-engine';
import {AoaoCraft,XiaozaoCraft,DafuCraft,YekariCraft,AzuCraft,HestiaCraft} from 'dula-assets/characters/stardust/characters.js';
import {StardustShrineScene} from 'dula-assets/scenes/stardust/StardustShrineScene.js';
import {StarfallColonnadeScene} from 'dula-assets/scenes/stardust/StarfallColonnadeScene.js';
import {PalaceGateScene} from 'dula-assets/scenes/stardust/PalaceGateScene.js';
import {EmberTierPalaceScene} from 'dula-assets/scenes/stardust/EmberTierPalaceScene.js';
registerAll();
registerCharacter('Aoao',AoaoCraft);
registerCharacter('Xiaozao',XiaozaoCraft);
registerCharacter('Dafu',DafuCraft);
registerCharacter('Yekari',YekariCraft);
registerCharacter('Azu',AzuCraft);
registerCharacter('Hestia',HestiaCraft);
registerScene('StardustShrineScene',StardustShrineScene);
registerScene('StarfallColonnadeScene',StarfallColonnadeScene);
registerScene('PalaceGateScene',PalaceGateScene);
registerScene('EmberTierPalaceScene',EmberTierPalaceScene);
