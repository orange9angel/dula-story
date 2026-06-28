import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';

import { OptimusPrimal } from './characters/OptimusPrimal.js';
import { Cheetor } from './characters/Cheetor.js';
import { Megatron } from './characters/Megatron.js';
import { Dinobot } from './characters/Dinobot.js';
import { Waspinator } from './characters/Waspinator.js';

import { SpaceChaseScene } from './scenes/SpaceChaseScene.js';
import { PrehistoricJungleScene } from './scenes/PrehistoricJungleScene.js';
import { VolcanoBaseScene } from './scenes/VolcanoBaseScene.js';

registerAll();

registerCharacter('OptimusPrimal', OptimusPrimal);
registerCharacter('Cheetor', Cheetor);
registerCharacter('Megatron', Megatron);
registerCharacter('Dinobot', Dinobot);
registerCharacter('Waspinator', Waspinator);

registerScene('SpaceChaseScene', SpaceChaseScene);
registerScene('PrehistoricJungleScene', PrehistoricJungleScene);
registerScene('VolcanoBaseScene', VolcanoBaseScene);
