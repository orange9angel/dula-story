import { registerAll } from 'dula-assets';
import { registerAnimation, registerCharacter, registerScene } from 'dula-engine';

import { Tom } from './characters/Tom.js';
import { Jerry } from './characters/Jerry.js';
import { CartoonKitchenScene } from './scenes/CartoonKitchenScene.js';
import {
  CatCatchStack,
  CatDoom,
  CatPounce,
  CatSkid,
  CatSneak,
  CatTrapPress,
  CartoonShush,
  MouseOffer,
  MouseScamper,
  MouseTaunt,
  CatReachCake,
  CatGrab,
  CatSlip,
  CatPieFace,
  MousePushCake,
  MouseDodge,
  MouseWaveGoodbye,
} from './animations/SlapstickActions.js';
import {
  FaceMischief,
  FaceGloat,
  FaceShockComedy,
} from './animations/ComedyFaces.js';

registerAll();

registerCharacter('Tom', Tom);
registerCharacter('Jerry', Jerry);
registerScene('CartoonKitchenScene', CartoonKitchenScene);

registerAnimation('CatSneak', CatSneak);
registerAnimation('MouseScamper', MouseScamper);
registerAnimation('CatPounce', CatPounce);
registerAnimation('CatCatchStack', CatCatchStack);
registerAnimation('CatSkid', CatSkid);
registerAnimation('MouseOffer', MouseOffer);
registerAnimation('CartoonShush', CartoonShush);
registerAnimation('MouseTaunt', MouseTaunt);
registerAnimation('CatTrapPress', CatTrapPress);
registerAnimation('CatDoom', CatDoom);
registerAnimation('CatReachCake', CatReachCake);
registerAnimation('CatGrab', CatGrab);
registerAnimation('CatSlip', CatSlip);
registerAnimation('CatPieFace', CatPieFace);
registerAnimation('MousePushCake', MousePushCake);
registerAnimation('MouseDodge', MouseDodge);
registerAnimation('MouseWaveGoodbye', MouseWaveGoodbye);
registerAnimation('FaceMischief', FaceMischief);
registerAnimation('FaceGloat', FaceGloat);
registerAnimation('FaceShockComedy', FaceShockComedy);
