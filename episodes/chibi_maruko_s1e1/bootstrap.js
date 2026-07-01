import { registerAll } from 'dula-assets';
import { registerCharacter, registerScene } from 'dula-engine';

import { Maruko } from './characters/Maruko.js';
import { Tama } from './characters/Tama.js';

import { ClassroomScene } from './scenes/ClassroomScene.js';

registerAll();

registerCharacter('Maruko', Maruko);
registerCharacter('Tama', Tama);

registerScene('ClassroomScene', ClassroomScene);
