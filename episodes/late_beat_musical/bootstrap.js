// 《迟到的一拍》资产注册：场景为集专属；角色 P2 建造（占位积木小人在 viewer.js 内）。
import {registerAll} from 'dula-assets';
import {registerScene} from 'dula-engine';
import {TheaterStageScene} from './scenes/TheaterStageScene.js';
registerAll();
registerScene('TheaterStageScene',TheaterStageScene);
